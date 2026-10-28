import type { Payment, PaymentDetail, PaymentList, PreparedPayment } from '@/entities'
import { apiClient } from '@/shared/lib'

/**
 * 결제 API — 토스페이먼츠 가결제 기준
 * 조회(getList·getDetail)는 백엔드 dev 구현. prepare·confirm·sync·cancel 은 [목 전용] 예정 API
 * 흐름(예정): 선점(POST /user/reservations/holds) → prepare → 결제창 → confirm(결제 완료 + 예약 확정)
 */

export interface ConfirmPaymentRequest {
  paymentKey: string
  orderId: string
  amount: number
}

export interface ConfirmPaymentResponse {
  payment: Payment
  reservationId: number
}

export const paymentApi = {
  /** 선점 정보로 주문번호·결제 금액 생성 */
  prepare: async (holdId: number) => {
    const { data } = await apiClient.post<PreparedPayment>('/user/payments/prepare', { holdId })
    return data
  },
  /** PG 승인 후 결제 완료 + 예약 확정 */
  confirm: async (body: ConfirmPaymentRequest) => {
    const { data } = await apiClient.post<ConfirmPaymentResponse>('/user/payments/confirm', body)
    return data
  },
  /** 결제 결과 재확인 */
  sync: async (paymentId: number) => {
    const { data } = await apiClient.post<Payment>(`/user/payments/${paymentId}/sync`)
    return data
  },
  cancel: async (paymentId: number, body?: { amount?: number; reason?: string }) => {
    const { data } = await apiClient.post<Payment>(`/user/payments/${paymentId}/cancel`, body)
    return data
  },
  /** 내 결제 목록 — 최신순, 페이지 단위 */
  getList: async (params?: { page?: number; size?: number }) => {
    const { data } = await apiClient.get<PaymentList>('/user/payments', { params })
    return data
  },
  /** 결제 상세 + 환불 이력 */
  getDetail: async (paymentId: number) => {
    const { data } = await apiClient.get<PaymentDetail>(`/user/payments/${paymentId}`)
    return data
  },
}
