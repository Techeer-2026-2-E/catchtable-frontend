import type { WaitingStatus } from '../waiting/model'

/** 백엔드 notification.dto.NotificationType — SSE 이벤트 이름과 같음 (철자 그대로 사용) */
export type NotificationType =
  | 'RESERVATION_CONFIRMED'
  | 'RESERVATION_CANCELED'
  | 'RESERVATION_CHANGED'
  | 'WAITING_CALLED'
  /** 미응답·노쇼·자동 만료 — 웨이팅 상태는 NO_SHOW 로 조회됨 */
  | 'WAITING_EXPIRED'
  | 'WAITING_CANCELED'
  /** 점주용: 매장 대기 목록이 바뀜 (targetId = 매장 id) */
  | 'WAITING_CHANGED'
  /** 고객용: 내 순번이 바뀜 */
  | 'WAITING_POSITION_CHANGED'

/** WAITING_CALLED payload — WaitingCallPayload */
export interface WaitingCallPayload {
  status: WaitingStatus
  waitNumber: number
  storeName: string
  calledAt: string
  expiresAt: string
}

/** WAITING_POSITION_CHANGED payload — WaitingPositionPayload */
export interface WaitingPositionPayload {
  waitingId: number
  currentPosition: number
  teamsAhead: number
  status: WaitingStatus
}

/** SSE 로 받는 실시간 알림 — NotificationMessage */
export interface NotificationMessage {
  eventId: string
  type: NotificationType
  /** 예약 id 또는 웨이팅 id (WAITING_CHANGED 는 매장 id) */
  targetId: number
  message: string
  /** 부가 데이터가 없는 알림은 null */
  payload: WaitingCallPayload | WaitingPositionPayload | null
  /** LocalDateTime (오프셋 없음, 서버 Asia/Seoul 기준) */
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
  RESERVATION_CHANGED: '예약이 변경됐어요',
  WAITING_CHANGED: '대기 목록이 바뀌었어요',
  WAITING_POSITION_CHANGED: '대기 순번이 바뀌었어요',
}
