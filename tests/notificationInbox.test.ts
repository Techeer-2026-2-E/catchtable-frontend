import { getResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import type { NotificationInbox } from '@/entities'
import { db, resetDb } from '@/mocks/db'
import { notificationInboxHandlers } from '@/mocks/handlers/notificationInbox'
import { notify } from '@/mocks/logic'

const ME = 1
const call = (method: string, path: string, init: { query?: Record<string, number>; body?: unknown } = {}) => {
  const url = new URL(`/api${path}`, location.href)
  Object.entries(init.query ?? {}).forEach(([k, v]) => url.searchParams.set(k, String(v)))
  return getResponse(
    notificationInboxHandlers,
    new Request(url, {
      method,
      headers: { 'X-Member-Id': String(ME), 'Content-Type': 'application/json' },
      body: init.body ? JSON.stringify(init.body) : undefined,
    }),
  )
}
const inbox = async (query: Record<string, number> = {}) => (await (await call('GET', '/user/notifications', { query }))!.json()) as NotificationInbox
const hasUnread = async () => ((await (await call('GET', '/user/notifications/unread'))!.json()) as { hasUnread: boolean }).hasUnread

describe('알림함 API (목)', () => {
  beforeEach(() => resetDb())

  it('최신순으로 주고 lastId 커서로 다음 장을 이어 준다', async () => {
    const first = await inbox({ size: 2 })
    expect(first.notifications).toHaveLength(2)
    expect(first.notifications[0].id).toBeGreaterThan(first.notifications[1].id)
    expect(first.hasNext).toBe(true)
    const next = await inbox({ size: 2, lastId: first.nextLastId! })
    expect(next.notifications.every((n) => n.id < first.nextLastId!)).toBe(true)
  })

  it('알림이 오면 알림함에 저장되고, 순번 변경은 저장하지 않는다', async () => {
    const before = db.notifications.length
    notify(ME, 'WAITING_POSITION_CHANGED', 1, '현재 2번째 순서예요')
    expect(db.notifications).toHaveLength(before)
    notify(ME, 'WAITING_CALLED', 1, '입장해 주세요')
    const top = (await inbox()).notifications[0]
    expect(top).toMatchObject({ type: 'WAITING_CALLED', read: false })
  })

  it('lastId 까지 읽음 처리하면 빨간 점이 꺼지고, 그 뒤에 온 알림은 안 읽음으로 남는다', async () => {
    expect(await hasUnread()).toBe(true)
    const newest = (await inbox()).notifications[0].id
    expect((await call('PATCH', '/user/notifications/read', { body: { lastId: newest } }))?.status).toBe(204)
    expect(await hasUnread()).toBe(false)
    notify(ME, 'RESERVATION_CHANGED', 1, '예약 시간이 바뀌었어요')
    expect(await hasUnread()).toBe(true)
  })

  it('한 건 삭제하면 목록에서 빠지고, 다시 지우면 404', async () => {
    const target = (await inbox()).notifications[0].id
    expect((await call('DELETE', `/user/notifications/${target}`))?.status).toBe(204)
    expect((await inbox()).notifications.some((n) => n.id === target)).toBe(false)
    expect((await call('DELETE', `/user/notifications/${target}`))?.status).toBe(404)
  })
})
