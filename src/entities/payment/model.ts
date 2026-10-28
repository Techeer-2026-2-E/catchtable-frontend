/*
 * 결제 — 백엔드 dev payment/dto (기능58 결제 상태)
 * 조회 API(GET /api/user/payments, /{paymentId})만 있고 준비·승인·취소 API 는 아직 없음
 * 흐름(예정): 선점(reservations/holds) → prepare → 결제창 → confirm
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
}

/** payment.entity.PaymentRefundStatus */
export type PaymentRefundStatus = 'REQUESTED' | 'COMPLETED' | 'NOT_REQUIRED' | 'FAILED' | 'UNKNOWN'

/** GET /api/user/payments/{paymentId} — PaymentDetailResponse */
export interface PaymentDetail {
  payment: Payment
  refunds: {
    refundId: number
    refundAmount: number
    status: PaymentRefundStatus
    cancelReason: string | null
    refundedAt: string | null
  }[]
}

/** GET /api/user/payments — PaymentListResponse */
export interface PaymentList {
  payments: Payment[]
  page: number
  size: number
  hasNext: boolean
}

/** [예정] POST /api/user/payments/prepare */
export interface PreparedPayment {
  orderId: string
  orderName: string
  amount: number
}
