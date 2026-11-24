import { getResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { WaitingReceipt } from '@/entities'
import { resetDb } from '@/mocks/db'
import { RECEIPT_STORE_IDS, waitingHandlers } from '@/mocks/handlers/waitings'
import { waitingIntakeKeyStorage } from '@/shared/lib'

const ME = 1
const STORE = [...RECEIPT_STORE_IDS][0]
const call = (method: string, path: string, init: { key?: string; body?: unknown } = {}) =>
  getResponse(
    waitingHandlers,
    new Request(new URL(`/api${path}`, location.href), {
      method,
      headers: { 'X-Member-Id': String(ME), 'Content-Type': 'application/json', ...(init.key && { 'Idempotency-Key': init.key }) },
      body: init.body ? JSON.stringify(init.body) : undefined,
    }),
  )
const apply = (key?: string, partyCount = 2) => call('POST', '/user/waitings', { key, body: { storeId: STORE, partyCount } })
const json = async (res: Response | undefined) => (await res!.json()) as WaitingReceipt

describe('웨이팅 대기표 (목)', () => {
  beforeEach(() => {
    // 연남동 한상 영업시간 안 (화요일 저녁 7시 30분)
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-24T19:30:00+09:00'))
    resetDb()
    localStorage.clear()
  })
  afterEach(() => vi.useRealTimers())

  it('대기표 방식 매장은 요청 키가 없으면 400', async () => {
    expect((await apply())?.status).toBe(400)
  })

  it('202 로 접수되고, 조회할 때마다 진행되어 번호가 발급된다', async () => {
    const res = await apply('key-1')
    expect(res?.status).toBe(202)
    expect(res?.headers.get('Retry-After')).toBe('2')
    const receipt = await json(res)
    expect(receipt).toMatchObject({ status: 'PENDING', intakeSequence: 1, partyCount: 2 })
    expect(receipt.waitNumber).toBeUndefined()

    const path = `/user/waitings/receipts/${receipt.receiptId}`
    expect((await json(await call('GET', path))).status).toBe('PROCESSING')
    const done = await call('GET', path)
    expect(done?.headers.get('Retry-After')).toBeNull()
    expect(await json(done)).toMatchObject({ status: 'REGISTERED', waitingStatus: 'WAITING' })
  })

  it('같은 키로 다시 보내면 같은 표 200, 같은 키로 인원을 바꾸면 409', async () => {
    const first = await json(await apply('key-2'))
    const again = await apply('key-2')
    expect(again?.status).toBe(200)
    expect((await json(again)).receiptId).toBe(first.receiptId)
    expect((await apply('key-2', 3))?.status).toBe(409)
  })

  it('번호 발급 전에는 철회 200, 발급 중이면 취소 요청 202', async () => {
    const a = await json(await apply('key-3'))
    const withdrawn = await call('DELETE', `/user/waitings/receipts/${a.receiptId}`)
    expect(withdrawn?.status).toBe(200)
    expect(await json(withdrawn)).toMatchObject({ status: 'WITHDRAWN', cancelOutcome: 'WITHDRAWN' })

    const b = await json(await apply('key-4'))
    await call('GET', `/user/waitings/receipts/${b.receiptId}`) // PROCESSING
    const requested = await call('DELETE', `/user/waitings/receipts/${b.receiptId}`)
    expect(requested?.status).toBe(202)
    expect((await json(await call('GET', `/user/waitings/receipts/${b.receiptId}`))).status).toBe('WITHDRAWN')
  })
})

describe('신청 요청 키 보관', () => {
  beforeEach(() => localStorage.clear())

  it('같은 회원, 매장, 인원이면 같은 키, 인원을 바꾸거나 지우면 새 키', () => {
    const k1 = waitingIntakeKeyStorage.get(ME, 4, 2)
    expect(waitingIntakeKeyStorage.get(ME, 4, 2)).toBe(k1)
    const k2 = waitingIntakeKeyStorage.get(ME, 4, 3)
    expect(k2).not.toBe(k1)
    waitingIntakeKeyStorage.clear(ME, 4)
    expect(waitingIntakeKeyStorage.get(ME, 4, 3)).not.toBe(k2)
  })
})
