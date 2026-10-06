import type { Notification } from '@/entities'
import { env } from '@/shared/config'
import { apiClient } from '@/shared/lib'

export const notificationApi = {
  /** 알림 목록 — 노션 명세 (백엔드 미구현, 응답 필드는 제안) */
  getList: async () => {
    const { data } = await apiClient.get<Notification[]>('/user/notifications')
    return data
  },
  read: async (notificationId: number) => {
    await apiClient.patch(`/user/notifications/${notificationId}/read`)
  },
  readAll: async () => {
    await apiClient.patch('/user/notifications/read-all')
  },
  /**
   * 실시간 알림 구독(SSE) URL — 백엔드 dev 구현: GET /api/user/notifications/subscribe?memberId=
   * EventSource 는 헤더를 못 붙이므로 회원 id 를 쿼리로 전달 (인증 도입 시 변경 예정)
   * 이벤트 이름 = NotificationType (RESERVATION_CONFIRMED 등), 연결 직후 "connect"
   */
  subscribeUrl: (memberId: number) => `${env.apiBaseUrl}/user/notifications/subscribe?memberId=${memberId}`,
}
