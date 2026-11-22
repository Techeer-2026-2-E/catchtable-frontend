import { http, HttpResponse } from 'msw'
import type { InboxNotification, NotificationInbox } from '@/entities'
import { db } from '../db'
import { now } from '../logic'
import { API, badRequest, before, body, memberIdOf, notFound, saved, unauthorized } from '../utils'

const DEFAULT_SIZE = 20
const MAX_SIZE = 50

const mine = (memberId: number) => db.notifications.filter((n) => n.memberId === memberId && !n.deletedAt)

/** 알림함 — 백엔드 UserNotificationInboxController (feat/281-notification-list, dev 미병합) */
export const notificationInboxHandlers = [
  /** 알림함 목록 — 최신순(id 내림차순), lastId 보다 오래된 것부터 size 개 */
  http.get(`${API}/user/notifications`, async ({ request }) => {
    await before()
    const memberId = memberIdOf(request)
    if (!memberId) return unauthorized()
    const q = new URL(request.url).searchParams
    const lastId = q.get('lastId') ? Number(q.get('lastId')) : Number.MAX_SAFE_INTEGER
    const size = Math.min(Math.max(Number(q.get('size') ?? DEFAULT_SIZE) || DEFAULT_SIZE, 1), MAX_SIZE)
    const rows = mine(memberId)
      .filter((n) => n.id < lastId)
      .sort((a, b) => b.id - a.id)
    const page = rows.slice(0, size)
    const notifications: InboxNotification[] = page.map((n) => ({
      id: n.id,
      type: n.type,
      targetId: n.targetId,
      message: n.message,
      read: n.readAt != null,
      createdAt: n.createdAt,
    }))
    const hasNext = rows.length > size
    const res: NotificationInbox = { notifications, nextLastId: hasNext ? page[page.length - 1].id : null, hasNext }
    return HttpResponse.json(res)
  }),

  /** 안 읽은 알림이 하나라도 있는지 */
  http.get(`${API}/user/notifications/unread`, async ({ request }) => {
    await before()
    const memberId = memberIdOf(request)
    if (!memberId) return unauthorized()
    return HttpResponse.json({ hasUnread: mine(memberId).some((n) => !n.readAt) })
  }),

  /** lastId 까지 읽음 — 그 뒤에 온 알림은 안 읽음으로 남음 */
  http.patch(`${API}/user/notifications/read`, async ({ request }) => {
    await before()
    const memberId = memberIdOf(request)
    if (!memberId) return unauthorized()
    const { lastId } = await body<{ lastId?: number }>(request)
    if (typeof lastId !== 'number' || !Number.isInteger(lastId) || lastId < 1) return badRequest('lastId 는 양수여야 합니다.')
    const at = now().format('YYYY-MM-DDTHH:mm:ssZ')
    mine(memberId)
      .filter((n) => n.id <= lastId && !n.readAt)
      .forEach((n) => (n.readAt = at))
    return saved(new HttpResponse(null, { status: 204 }))
  }),

  /** 1건 삭제 (soft delete). 없거나 남의 것이거나 이미 지웠으면 404 */
  http.delete(`${API}/user/notifications/:notificationId`, async ({ request, params }) => {
    await before()
    const memberId = memberIdOf(request)
    if (!memberId) return unauthorized()
    const row = mine(memberId).find((n) => n.id === Number(params.notificationId))
    if (!row) return notFound('NOTIFICATION_NOT_FOUND', '알림을 찾을 수 없습니다.')
    row.deletedAt = now().format('YYYY-MM-DDTHH:mm:ssZ')
    return saved(new HttpResponse(null, { status: 204 }))
  }),
]
