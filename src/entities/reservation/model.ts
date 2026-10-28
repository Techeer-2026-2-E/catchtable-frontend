import type { BadgeTone } from '@/shared/ui'

/*
 * 예약 도메인 타입 — 백엔드 dev reservation/dto 와 필드명을 맞춤
 * 시각은 모두 ISO OffsetDateTime 문자열 (예: 2026-10-03T18:00:00+09:00)
 */

/** reservation.entity.ReservationStatus — 선점(결제 대기)도 같은 예약 행이라 PENDING_PAYMENT·EXPIRED 가 있음 */
export type ReservationStatus = 'PENDING_PAYMENT' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'EXPIRED'

/** reservation.entity.CancellationActor */
export type CancellationActor = 'CUSTOMER' | 'OWNER'

/** 고객용 — ReservationResponse */
export interface Reservation {
  reservationId: number
  storeId: number
  storeName: string
  tableId: number | null
  reservationStartAt: string
  reservationEndAt: string
  partySize: number
  status: ReservationStatus
  requestedAt: string
  confirmedAt: string | null
  cancelledAt: string | null
  cancellationActor: CancellationActor | null
  cancellationReason: string | null
}

/** 점주용 — OwnerReservationResponse */
export interface OwnerReservation {
  reservationId: number
  storeId: number
  memberId: number
  customerName: string
  customerPhone: string
  tableId: number | null
  reservationStartAt: string
  reservationEndAt: string
  partySize: number
  status: ReservationStatus
  checkedInAt: string | null
  checkedInByMemberId: number | null
  cancelledAt: string | null
  cancellationActor: CancellationActor | null
  cancellationReason: string | null
  noShowAt: string | null
  noShowByMemberId: number | null
  noShowReason: string | null
}

/**
 * 화면 표시용 상태 — 백엔드는 방문 확인을 status 가 아니라 checkedInAt 으로 표현하므로
 * CONFIRMED + checkedInAt 이면 "방문 중(VISITED)" 으로 보여준다
 */
export type ReservationDisplayStatus = ReservationStatus | 'VISITED'

export const getReservationDisplayStatus = (r: { status: ReservationStatus; checkedInAt?: string | null }): ReservationDisplayStatus =>
  r.status === 'CONFIRMED' && r.checkedInAt ? 'VISITED' : r.status

export const RESERVATION_STATUS_LABEL: Record<ReservationDisplayStatus, string> = {
  PENDING_PAYMENT: '결제 대기',
  EXPIRED: '선점 만료',
  CONFIRMED: '예약 확정',
  VISITED: '방문 중',
  COMPLETED: '이용 완료',
  CANCELLED: '취소됨',
  NO_SHOW: '노쇼',
}

/**
 * 상태 배지 톤 — 포인트 컬러 사용을 줄이기 위해
 * 진행 중인 상태만 brand, 예외(노쇼)만 danger, 나머지는 neutral
 */
export const RESERVATION_STATUS_TONE: Record<ReservationDisplayStatus, BadgeTone> = {
  PENDING_PAYMENT: 'primary',
  EXPIRED: 'neutral',
  CONFIRMED: 'brand',
  VISITED: 'brand',
  COMPLETED: 'neutral',
  CANCELLED: 'neutral',
  NO_SHOW: 'danger',
}

/* ---------- 예약·웨이팅 내역 — GET /api/user/reservations?type=&status= (HistoryItemResponse) ---------- */

export type HistoryType = 'RESERVATION' | 'WAITING'
/** ACTIVE = 진행 중, ENDED = 종료 */
export type HistoryStatus = 'ACTIVE' | 'ENDED'

export interface HistoryItem {
  type: HistoryType
  /** 예약 id 또는 웨이팅 id */
  id: number
  storeId: number
  storeName: string
  /** 예약은 ReservationStatus, 웨이팅은 WaitingStatus 값 (문자열) */
  status: string
  active: boolean
  partySize: number
  /** 예약만 */
  reservationStartAt: string | null
  reservationEndAt: string | null
  /** 웨이팅만 */
  waitingDate: string | null
  waitNumber: number | null
  requestedAt: string
}
