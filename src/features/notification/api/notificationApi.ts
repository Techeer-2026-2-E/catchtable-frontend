import { env } from '@/shared/config'

export const notificationApi = {
  /**
   * 실시간 알림 구독(SSE) URL — GET /api/user/notifications/subscribe?memberId=
   * EventSource 는 헤더를 못 붙이므로 회원 id 를 쿼리로 전달
   * 이벤트 이름 = NotificationType (RESERVATION_CONFIRMED 등), 연결 직후 "connect"
   */
  subscribeUrl: (memberId: number) => `${env.apiBaseUrl}/user/notifications/subscribe?memberId=${memberId}`,
}
