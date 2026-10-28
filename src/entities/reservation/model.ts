import type { BadgeTone } from '@/shared/ui'

/*
 * 예약 도메인 타입 — 백엔드 dev reservation/dto 와 필드명을 맞춤
 * 시각은 모두 ISO OffsetDateTime 문자열 (예: 2026-10-03T18:00:00+09:00)
 */

/** reservation.entity.ReservationStatus */
export type ReservationStatus = 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'

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
  CONFIRMED: 'brand',
  VISITED: 'brand',
  COMPLETED: 'neutral',
  CANCELLED: 'neutral',
  NO_SHOW: 'danger',
}

/* ---------- P2: 예약금 ---------- */

/** 테이블 5분 임시 선점 — POST /api/user/reservations/holds (노션 P2 MOCK 계약 초안) */
export interface ReservationHold {
  holdId: number
  storeId: number
  reservationStartAt: string
  partySize: number
  /** 결제할 예약금(원) */
  depositAmount: number
  status: 'HOLDING' | 'PAID' | 'RELEASED' | 'EXPIRED'
  serverTime: string
  expiresAt: string
  remainingSeconds: number
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
