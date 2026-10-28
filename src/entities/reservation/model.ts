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
  /* ----- [목 전용] 백엔드 응답에 추가 요청 필요 ----- */
  /** 방문 확인 시각 — 있으면 "방문 중" */
  checkedInAt?: string | null
  /** 배정된 테이블 번호 (tableId 대신 화면 표시용) */
  tableNumber?: number | null
  /** 좌석 타입 라벨 (룸·홀·바) */
  tableTypeLabel?: string | null
  /** 리뷰 작성 여부 (P2) */
  reviewed?: boolean
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
  /* ----- [목 전용] ----- */
  tableNumber?: number | null
  tableTypeLabel?: string | null
}

/**
 * 화면 표시용 상태 — 백엔드는 방문 확인을 status 가 아니라 checkedInAt 으로 표현하므로
 * CONFIRMED + checkedInAt 이면 "방문 중(VISITED)" 으로 보여준다
 */
export type ReservationDisplayStatus = ReservationStatus | 'VISITED'

export const getReservationDisplayStatus = (r: {
  status: ReservationStatus
  checkedInAt?: string | null
}): ReservationDisplayStatus => (r.status === 'CONFIRMED' && r.checkedInAt ? 'VISITED' : r.status)

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

/* ---------- P2: 예약금 ---------- */

/**
 * 테이블 5분 임시 선점 — POST·GET /api/user/reservations/holds (ReservationHoldResponse)
 * 선점은 PENDING_PAYMENT 예약 자체라 holdId 와 reservationId 가 같음
 */
export interface ReservationHold {
  holdId: number
  reservationId: number
  storeId: number
  tableId: number | null
  reservationStartAt: string
  reservationEndAt: string
  partySize: number
  /** PENDING_PAYMENT(선점 중) · CONFIRMED · CANCELLED(해제) · EXPIRED */
  status: ReservationStatus
  /** 생성 시점 + 5분. 재조회로 연장되지 않음 */
  expiresAt: string
  /** 서버 현재 시각 — 로컬 시계 차이 보정용 */
  serverTime: string
  remainingSeconds: number
  /** [목 전용] 결제할 예약금(원) — 백엔드 선점 응답에는 금액이 없음 (예약금 설정·결제 계약 예정) */
  depositAmount?: number
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
  /** [목 전용] 리뷰 작성 여부 — 백엔드 응답에 없음 (없으면 이용 완료 예약에 '리뷰 쓰기' 표시) */
  reviewed?: boolean
}

/** 환불 예상액 — GET /api/user/reservations/{id}/refund-preview */
export interface RefundPreview {
  reservationId: number
  paidAmount: number
  refundAmount: number
  /** 적용된 환불 비율(%) */
  refundRate: number
  policyDescription: string
}
