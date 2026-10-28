/** 백엔드 notification.dto.NotificationType */
export type NotificationType =
  | 'RESERVATION_CONFIRMED'
  | 'RESERVATION_CANCELED'
  | 'WAITING_CALLED'
  | 'WAITING_EXPIRED'
  | 'WAITING_CANCELED'

/** SSE 로 받는 실시간 알림 — NotificationMessage */
export interface NotificationMessage {
  eventId: string
  type: NotificationType
  /** 예약 id 또는 웨이팅 id */
  targetId: number
  message: string
  occurredAt: string
}

/** 알림 목록 항목 — GET /api/user/notifications (노션 명세, 응답 필드는 제안) */
export interface Notification {
  id: number
  type: NotificationType
  targetId: number
  title: string
  message: string
  read: boolean
  createdAt: string
}

export const NOTIFICATION_TITLE: Record<NotificationType, string> = {
  RESERVATION_CONFIRMED: '예약이 확정됐어요',
  RESERVATION_CANCELED: '예약이 취소됐어요',
  WAITING_CALLED: '입장 가능합니다!',
  WAITING_EXPIRED: '웨이팅 순번이 만료됐어요',
  WAITING_CANCELED: '웨이팅이 취소됐어요',
}
