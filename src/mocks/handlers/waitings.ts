import { http, HttpResponse } from 'msw'
import { ACTIVE_WAITING_STATUSES, type WaitingReceipt } from '@/entities'
import { dayjs } from '@/shared/lib/dayjs'
import { db, nextId, type WaitingRow } from '../db'
import { endWaiting, findStore, isStoreOpenAt, nowIso, queueChanged, toWaiting, toWaitingRegistration, toWaitingTermination } from '../logic'
import { API, badRequest, before, body, conflict, memberIdOf, notFound, saved, unauthorized } from '../utils'

const waitingNotFound = () => notFound('WAITING_NOT_FOUND', '웨이팅을 찾을 수 없습니다.')

/** 새 웨이팅 등록 — 매장 마지막 번호 + 1 */
function createWaitingRow(storeId: number, memberId: number, partyCount: number) {
  const lastNumber = Math.max(0, ...db.waitings.filter((w) => w.storeId === storeId).map((w) => w.waitNumber))
  const createdAt = nowIso()
  const row: WaitingRow = {
    waitingId: nextId('waiting'),
    storeId,
    memberId,
    waitNumber: lastNumber + 1,
    partyCount,
    status: 'WAITING',
    createdAt,
    calledAt: null,
    callExpiresAt: null,
    updatedAt: createdAt,
  }
  db.waitings.push(row)
  queueChanged(storeId)
  return row
}

/*
 * 대기표 방식 — 접수 정책이 켜진 매장 (백엔드 waiting_intake_policy, docs/frontend/waiting-receipt-lifecycle.md)
 * 목에서는 연남동 한상(4)만 켜 둔다. 대기표는 새로고침하면 사라지는 메모리 값
 * 조회할 때마다 한 단계씩 진행: PENDING → PROCESSING → REGISTERED (번호 발급)
 */
export const RECEIPT_STORE_IDS = new Set([4])
const RETRY_AFTER_SEC = 2

interface ReceiptRow {
  receiptId: string
  memberId: number
  key: string
  storeId: number
  receivedDate: string
  intakeSequence: number
  partyCount: number
  status: WaitingReceipt['status']
  waitingId?: number
  cancelOutcome?: WaitingReceipt['cancelOutcome']
}
const receipts = new Map<string, ReceiptRow>()

const validKey = (key: string | null): key is string => !!key && key.length <= 128 && /^[\x21-\x7e]+$/.test(key)

function viewOf(r: ReceiptRow): WaitingReceipt {
  const w = r.waitingId != null ? db.waitings.find((x) => x.waitingId === r.waitingId) : undefined
  const active = !!w && ACTIVE_WAITING_STATUSES.includes(w.status)
  return {
    receiptId: r.receiptId,
    storeId: r.storeId,
    receivedDate: r.receivedDate,
    intakeSequence: r.intakeSequence,
    partyCount: r.partyCount,
    status: r.status,
    ...(w && {
      waitingId: w.waitingId,
      waitNumber: w.waitNumber,
      waitingStatus: w.status,
      ...(active && {
        teamsAhead: db.waitings.filter((x) => x.storeId === w.storeId && x.status === 'WAITING' && x.waitNumber < w.waitNumber).length,
      }),
    }),
    ...(r.cancelOutcome && { cancelOutcome: r.cancelOutcome }),
  }
}

function receiptResponse(r: ReceiptRow, status: number) {
  const view = viewOf(r)
  const headers: Record<string, string> = { 'Cache-Control': 'no-store', Location: `/api/user/waitings/receipts/${r.receiptId}` }
  if (['PENDING', 'PROCESSING', 'CANCEL_REQUESTED'].includes(r.status)) headers['Retry-After'] = String(RETRY_AFTER_SEC)
  return saved(HttpResponse.json(view, { status, headers }))
}

/** 조회 한 번에 한 단계씩 처리가 진행된 것처럼 */
function advance(r: ReceiptRow) {
  if (r.status === 'PENDING') r.status = 'PROCESSING'
  else if (r.status === 'PROCESSING') {
    r.waitingId = createWaitingRow(r.storeId, r.memberId, r.partyCount).waitingId
    r.status = 'REGISTERED'
  } else if (r.status === 'CANCEL_REQUESTED') {
    r.status = 'WITHDRAWN'
    r.cancelOutcome = 'WITHDRAWN'
  }
}

function submitReceipt(memberId: number, storeId: number, partyCount: number, key: string | null) {
  if (!validKey(key)) return badRequest('Idempotency-Key 가 필요합니다.')
  const replay = [...receipts.values()].find((r) => r.memberId === memberId && r.key === key)
  if (replay) {
    if (replay.storeId !== storeId || replay.partyCount !== partyCount) {
      return conflict('WAITING_RECEIPT_KEY_CONFLICT', '이미 다른 웨이팅 신청에 사용한 요청 키입니다.')
    }
    return receiptResponse(replay, 200)
  }
  // 같은 회원, 매장, 당일에 진행 중인 신청이 있으면 그 표를 돌려줌
  const today = dayjs().format('YYYY-MM-DD')
  const active = [...receipts.values()].find((r) => {
    if (r.memberId !== memberId || r.storeId !== storeId || r.receivedDate !== today) return false
    if (['PENDING', 'PROCESSING', 'CANCEL_REQUESTED'].includes(r.status)) return true
    const w = r.waitingId != null ? db.waitings.find((x) => x.waitingId === r.waitingId) : undefined
    return r.status === 'REGISTERED' && !!w && ACTIVE_WAITING_STATUSES.includes(w.status)
  })
  if (active) {
    return active.partyCount === partyCount
      ? receiptResponse(active, 200)
      : conflict('DUPLICATE_ACTIVE_WAITING', '이미 이 매장에 진행 중인 웨이팅이 있습니다.')
  }
  const row: ReceiptRow = {
    receiptId: crypto.randomUUID(),
    memberId,
    key,
    storeId,
    receivedDate: today,
    intakeSequence: [...receipts.values()].filter((r) => r.storeId === storeId && r.receivedDate === today).length + 1,
    partyCount,
    status: 'PENDING',
  }
  receipts.set(row.receiptId, row)
  return receiptResponse(row, 202)
}

/** 고객 웨이팅 API — 백엔드 dev WaitingController */
export const waitingHandlers = [
  /** 신청 — 이미 이 매장에 진행 중인 웨이팅이 있으면 그대로 200 (백엔드 멱등 처리와 동일) */
  http.post(`${API}/user/waitings`, async ({ request }) => {
    await before()
    const memberId = memberIdOf(request)
    if (!memberId) return unauthorized()
    const b = await body<{ storeId: number; partyCount: number }>(request)
    const store = findStore(Number(b.storeId))
    if (!store) return notFound('STORE_NOT_FOUND', '매장을 찾을 수 없습니다')
    if (!b.partyCount || b.partyCount < 1 || b.partyCount > 20) return badRequest('인원수는 1~20명이어야 합니다.')
    if (!store.waitingAvailable || !store.waitingSettings.open) {
      return conflict('WAITING_CLOSED', '지금은 웨이팅을 받지 않는 매장입니다.')
    }
    if (!isStoreOpenAt(store, dayjs())) {
      return conflict('WAITING_OUTSIDE_BUSINESS_HOURS', '영업 시간이 아니어서 웨이팅을 신청할 수 없습니다.')
    }
    if (RECEIPT_STORE_IDS.has(store.id)) return submitReceipt(memberId, store.id, b.partyCount, request.headers.get('Idempotency-Key'))

    const existing = db.waitings.find(
      (w) => w.storeId === store.id && w.memberId === memberId && ACTIVE_WAITING_STATUSES.includes(w.status),
    )
    if (existing) return HttpResponse.json(toWaitingRegistration(existing), { status: 200 })
    const row = createWaitingRow(store.id, memberId, b.partyCount)
    return saved(HttpResponse.json(toWaitingRegistration(row), { status: 201 }))
  }),

  /** 대기표 조회 — 본인 것만 */
  http.get(`${API}/user/waitings/receipts/:receiptId`, async ({ params, request }) => {
    await before()
    const r = receipts.get(String(params.receiptId))
    if (!r || r.memberId !== memberIdOf(request)) return notFound('WAITING_RECEIPT_NOT_FOUND', '대기표를 찾을 수 없습니다.')
    advance(r)
    return receiptResponse(r, 200)
  }),

  /** 대기표 취소 — 발급 전 철회 200, 발급 중 202(취소 의사 저장), 발급 후 실제 취소 200, 취소 불가 409 */
  http.delete(`${API}/user/waitings/receipts/:receiptId`, async ({ params, request }) => {
    await before()
    const r = receipts.get(String(params.receiptId))
    if (!r || r.memberId !== memberIdOf(request)) return notFound('WAITING_RECEIPT_NOT_FOUND', '대기표를 찾을 수 없습니다.')
    if (r.status === 'PENDING') {
      r.status = 'WITHDRAWN'
      r.cancelOutcome = 'WITHDRAWN'
      return receiptResponse(r, 200)
    }
    if (r.status === 'PROCESSING' || r.status === 'CANCEL_REQUESTED') {
      r.status = 'CANCEL_REQUESTED'
      return receiptResponse(r, 202)
    }
    const w = r.waitingId != null ? db.waitings.find((x) => x.waitingId === r.waitingId) : undefined
    if (r.status === 'REGISTERED' && w && ACTIVE_WAITING_STATUSES.includes(w.status)) {
      endWaiting(w, 'CANCELED', 'CUSTOMER_CANCELED')
      queueChanged(w.storeId)
      r.status = 'CANCELED'
      r.cancelOutcome = 'CANCELED'
      return receiptResponse(r, 200)
    }
    if (r.status === 'REGISTERED') {
      r.cancelOutcome = 'REJECTED'
      return receiptResponse(r, 409)
    }
    return receiptResponse(r, 200)
  }),

  http.get(`${API}/user/waitings/:waitingId`, async ({ params, request }) => {
    await before()
    const w = db.waitings.find((x) => x.waitingId === Number(params.waitingId))
    if (!w || w.memberId !== memberIdOf(request)) return waitingNotFound()
    return HttpResponse.json(toWaiting(w))
  }),

  /** 방문 의사 응답 — CALLED 유지, 반복 응답은 최초 시각 반환 */
  http.post(`${API}/user/waitings/:waitingId/accept`, async ({ params, request }) => {
    await before()
    const w = db.waitings.find((x) => x.waitingId === Number(params.waitingId))
    if (!w || w.memberId !== memberIdOf(request)) return waitingNotFound()
    const respond = () =>
      HttpResponse.json({
        waitingId: w.waitingId,
        status: w.status,
        arrivalIntent: 'COMING',
        respondedAt: w.respondedAt,
        expiresAt: w.callExpiresAt,
      })
    if (w.status !== 'CALLED') return conflict('WAITING_NOT_RESPONDABLE', '응답할 수 없는 웨이팅입니다.')
    if (w.respondedAt) return respond()
    w.respondedAt = nowIso()
    w.updatedAt = w.respondedAt
    queueChanged(w.storeId)
    return saved(respond())
  }),

  http.delete(`${API}/user/waitings/:waitingId`, async ({ params, request }) => {
    await before()
    const w = db.waitings.find((x) => x.waitingId === Number(params.waitingId))
    if (!w || w.memberId !== memberIdOf(request)) return waitingNotFound()
    if (!ACTIVE_WAITING_STATUSES.includes(w.status)) return conflict('WAITING_NOT_CANCELLABLE', '취소할 수 없는 웨이팅입니다.')
    endWaiting(w, 'CANCELED', 'CUSTOMER_CANCELED')
    queueChanged(w.storeId)
    return saved(HttpResponse.json(toWaitingTermination(w)))
  }),
]
