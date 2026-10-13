import { http, HttpResponse, sse } from 'msw'
import { db } from '../db'
import { subscribe } from '../logic'
import { API, before, memberIdOf, notFound, saved, unauthorized } from '../utils'

const present = ({ memberId: _m, ...n }: (typeof db.notifications)[number]) => n

/** 알림 — 목록·읽음은 노션 명세, 실시간 구독(SSE)은 백엔드 dev 구현과 같은 형식 */
export const notificationHandlers = [
  /**
   * GET /api/user/notifications/subscribe?memberId=
   * 연결 직후 "connect" 이벤트, 이후 이벤트 이름 = NotificationType, data = NotificationMessage(JSON)
   */
  sse(`${API}/user/notifications/subscribe`, ({ client, request }) => {
    const memberId = Number(new URL(request.url).searchParams.get('memberId'))
    client.send({ event: 'connect', data: 'connected' } as never)
    const unsubscribe = subscribe(memberId, (message) => {
      client.send({ event: message.type, data: JSON.stringify(message) } as never)
    })
    request.signal.addEventListener('abort', unsubscribe)
  }),

  http.get(`${API}/user/notifications`, async ({ request }) => {
    await before()
    const memberId = memberIdOf(request)
    if (!memberId) return unauthorized()
    const list = db.notifications
      .filter((n) => n.memberId === memberId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return HttpResponse.json(list.map(present))
  }),

  http.patch(`${API}/user/notifications/read-all`, async ({ request }) => {
    await before()
    const memberId = memberIdOf(request)
    if (!memberId) return unauthorized()
    db.notifications.forEach((n) => n.memberId === memberId && (n.read = true))
    return saved(new HttpResponse(null, { status: 200 }))
  }),

  http.patch(`${API}/user/notifications/:notificationId/read`, async ({ params, request }) => {
    await before()
    const n = db.notifications.find((x) => x.id === Number(params.notificationId) && x.memberId === memberIdOf(request))
    if (!n) return notFound('NOTIFICATION_NOT_FOUND', '알림을 찾을 수 없습니다.')
    n.read = true
    return saved(new HttpResponse(null, { status: 200 }))
  }),
]
