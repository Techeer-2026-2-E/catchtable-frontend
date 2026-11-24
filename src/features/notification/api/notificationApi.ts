import type { NotificationInbox, NotificationUnread } from '@/entities'
import { env } from '@/shared/config'
import { apiClient } from '@/shared/lib'

export const notificationApi = {
  /**
   * 실시간 알림 구독(SSE) URL — GET /api/user/notifications/subscribe?memberId=
   * EventSource 는 헤더를 못 붙이므로 회원 id 를 쿼리로 전달
   * 이벤트 이름 = NotificationType (RESERVATION_CONFIRMED 등), 연결 직후 "connect"
   */
  subscribeUrl: (memberId: number) => `${env.apiBaseUrl}/user/notifications/subscribe?memberId=${memberId}`,

  /** 알림함 — 최신순. lastId 를 주면 그보다 오래된 것부터 (size 기본 20, 최대 50) */
  getInbox: async (params: { lastId?: number; size?: number } = {}) => {
    const { data } = await apiClient.get<NotificationInbox>('/user/notifications', { params })
    return data
  },
  /** 안 읽은 알림이 있는지 — 종 아이콘 빨간 점 */
  getUnread: async () => {
    const { data } = await apiClient.get<NotificationUnread>('/user/notifications/unread')
    return data
  },
  /** 화면에 보인 가장 최신 알림(lastId)까지 읽음 처리 */
  markRead: async (lastId: number) => {
    await apiClient.patch('/user/notifications/read', { lastId })
  },
  /** 알림 1건 삭제. 오래된 알림을 자동으로 지우지 않으므로 사용자가 직접 지운다 */
  remove: async (notificationId: number) => {
    await apiClient.delete(`/user/notifications/${notificationId}`)
  },
}
