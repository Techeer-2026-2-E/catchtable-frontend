import { sse } from 'msw'
import { subscribe } from '../logic'
import { API } from '../utils'

/** 실시간 알림 — 백엔드 NotificationController (알림함 API 는 없음) */
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
]
