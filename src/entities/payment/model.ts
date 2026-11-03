/*
 * 결제 — 백엔드 dev payment/dto
 * 흐름: 선점(reservations/holds) → prepare → Toss 결제창 → confirm → 서버가 확인한 DONE 만 예약 확정
 */

/** payment.entity.PaymentStatus */
export type PaymentStatus =
  | 'READY' // 결제 대기
  | 'DONE' // 승인 완료
  | 'FAILED' // 승인 실패
  | 'CANCELED' // 승인 전 취소·이탈·만료
  | 'TIMEOUT' // 결과 불명 — 실패가 아니라 "결제 확인 중"
  | 'PARTIAL_REFUNDED'
  | 'REFUNDED'

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  READY: '결제 대기',
  DONE: '결제 완료',
  FAILED: '결제 실패',
  CANCELED: '결제 취소',
  TIMEOUT: '결제 확인 중',
  PARTIAL_REFUNDED: '부분 환불',
  REFUNDED: '환불 완료',
}

/** PaymentResponse */
export interface Payment {
  paymentId: number
  /** 승인 이후(DONE·PARTIAL_REFUNDED·REFUNDED)에만 값이 있음 */
  reservationId: number | null
  holdId: number
  orderId: string
  orderName: string
  amount: number
  status: PaymentStatus
  /** Toss 값 그대로 (예: 카드, 간편결제), 승인 전 null */
  method: string | null
  approvedAt: string | null
  /** 누적 환불액 */
  canceledAmount: number
  receiptUrl: string | null
  /** 예약 확정 없는 승인 — 환불 대상 */
  refundRequired: boolean
}

/** payment.entity.PaymentRefundStatus */
export type PaymentRefundStatus = 'REQUESTED' | 'COMPLETED' | 'NOT_REQUIRED' | 'FAILED' | 'UNKNOWN'

export const PAYMENT_REFUND_STATUS_LABEL: Record<PaymentRefundStatus, string> = {
  REQUESTED: '환불 진행 중',
  COMPLETED: '환불 완료',
  NOT_REQUIRED: '환불 금액 없음',
  FAILED: '환불 실패',
  UNKNOWN: '환불 확인 중',
}

/** GET /api/user/payments/{paymentId} — PaymentDetailResponse (결제 필드가 최상위에 펼쳐져 옴) */
export interface PaymentDetail extends Payment {
  refunds: {
    refundId: number
    refundAmount: number
    status: PaymentRefundStatus
    cancelReason: string | null
    refundedAt: string | null
  }[]
  receiptNotice: string
}

/** GET /api/user/payments — PaymentListResponse */
export interface PaymentList {
  payments: Payment[]
  page: number
  size: number
  hasNext: boolean
}

/** POST /api/user/payments/prepare — 같은 선점의 재요청은 같은 주문·금액·만료시각 */
export interface PreparedPayment {
  paymentId: number
  reservationId: number
  holdId: number
  orderId: string
  orderName: string
  amount: number
  status: PaymentStatus
  expiresAt: string
  serverTime: string
  remainingSeconds: number
}
