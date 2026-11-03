import type { Payment, PaymentDetail, PaymentList, PreparedPayment } from '@/entities'
import { apiClient, PG_TIMEOUT } from '@/shared/lib'

export interface ConfirmPaymentRequest {
  paymentKey: string
  orderId: string
  amount: number
}

/** 결제 API — 백엔드 dev UserPaymentController · UserPaymentApprovalController */
export const paymentApi = {
  /** 저장된 유료 선점으로 주문 준비 — 같은 선점 재요청은 같은 주문·금액·만료시각 */
  prepare: async (holdId: number) => {
    const { data } = await apiClient.post<PreparedPayment>('/user/payments/prepare', { holdId })
    return data
  },
  /** 결제창 인증 후 승인 — 서버가 확인한 DONE 만 예약 확정. 같은 요청 재시도 가능 */
  confirm: async (body: ConfirmPaymentRequest) => {
    const { data } = await apiClient.post<Payment>('/user/payments/confirm', body, { timeout: PG_TIMEOUT })
    return data
  },
  /** Toss 원장을 다시 조회해 결제·예약 상태 보정 */
  sync: async (paymentId: number) => {
    const { data } = await apiClient.post<PaymentDetail>(`/user/payments/${paymentId}/sync`, undefined, { timeout: PG_TIMEOUT })
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
