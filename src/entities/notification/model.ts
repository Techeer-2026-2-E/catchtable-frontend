export interface Notification {
  id: number
  title: string
  content: string
  read: boolean
  createdAt: string
  /** 알림 종류 — 아이콘·이동 경로 결정용, 백엔드 확정 필요 */
  type?: 'WAITING_CALLED' | 'WAITING_POSITION' | 'RESERVATION_CONFIRMED' | 'RESERVATION_CANCELED' | 'REVIEW_REQUEST'
  /** 탭 시 이동할 경로 */
  link?: string
}
