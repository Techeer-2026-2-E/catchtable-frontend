/** 토스페이먼츠 가결제 기준 — 명세 보류 상태 (P2) */
export type PaymentStatus = 'READY' | 'DONE' | 'CANCELED' | 'PARTIAL_CANCELED' | 'FAILED'

export interface Payment {
  id: number
  reservationId: number
  orderId: string
  amount: number
  status: PaymentStatus
  method?: string
  approvedAt?: string
  receiptUrl?: string
}
