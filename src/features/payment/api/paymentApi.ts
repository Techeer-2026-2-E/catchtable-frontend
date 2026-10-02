import type { PageResponse, Payment } from '@/entities'
import { apiClient } from '@/shared/lib'

/**
 * 결제 API — 명세 보류 상태 (토스페이먼츠 가결제, P2)
 * 흐름: 선점(reservation holds) → prepare → 토스 결제창 → confirm
 */

export interface PreparePaymentResponse {
  orderId: string
  amount: number
}

export interface ConfirmPaymentRequest {
  paymentKey: string
  orderId: string
  amount: number
}

export const paymentApi = {
  /** 선점 정보로 주문번호·결제 금액 생성 */
  prepare: async (holdId: number) => {
    const { data } = await apiClient.post<PreparePaymentResponse>('/user/payments/prepare', { holdId })
    return data
  },
  /** PG 승인 후 결제 완료 + 예약 확정 */
  confirm: async (body: ConfirmPaymentRequest) => {
    const { data } = await apiClient.post<Payment>('/user/payments/confirm', body)
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
  getList: async (params?: { page?: number; size?: number }) => {
    const { data } = await apiClient.get<PageResponse<Payment>>('/user/payments', { params })
    return data
  },
  getDetail: async (paymentId: number) => {
    const { data } = await apiClient.get<Payment>(`/user/payments/${paymentId}`)
    return data
  },
}
