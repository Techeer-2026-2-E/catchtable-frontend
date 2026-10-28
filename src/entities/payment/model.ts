/*
 * 결제 (P2, 노션 명세 "payments 보류") — 토스페이먼츠 가결제 기준
 * 흐름: 선점(reservations/holds) → prepare → 결제창 → confirm
 */
export type PaymentStatus = 'READY' | 'DONE' | 'CANCELED' | 'PARTIAL_CANCELED' | 'FAILED'

export interface Payment {
  paymentId: number
  reservationId: number | null
  holdId: number
  orderId: string
  orderName: string
  amount: number
  status: PaymentStatus
  method: string | null
  approvedAt: string | null
  canceledAmount: number
  receiptUrl: string | null
}

/** POST /api/user/payments/prepare */
export interface PreparedPayment {
  orderId: string
  orderName: string
  amount: number
}
