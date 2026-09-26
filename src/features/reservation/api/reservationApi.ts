import type { AvailabilitySlot, Reservation, ReservationHold } from '@/entities'
import { apiClient } from '@/shared/lib'

export interface CreateReservationRequest {
  storeId: number
  /** YYYY-MM-DD */
  date: string
  /** HH:mm */
  time: string
  partySize: number
  /** P2: 예약금 사용 시 선점 ID */
  holdId?: number
}

export interface CreateHoldRequest {
  storeId: number
  date: string
  time: string
  partySize: number
}

export const reservationApi = {
  /** 예약 가능 시간·잔여 테이블 */
  getAvailability: async (storeId: number, params: { date: string; partySize?: number }) => {
    const { data } = await apiClient.get<AvailabilitySlot[]>(`/user/stores/${storeId}/availability`, {
      params,
    })
    return data
  },
  /** 예약 생성 — 테이블 자동 배정 후 즉시 확정 */
  create: async (body: CreateReservationRequest) => {
    const { data } = await apiClient.post<Reservation>('/user/reservations', body)
    return data
  },
  getList: async () => {
    const { data } = await apiClient.get<Reservation[]>('/user/reservations')
    return data
  },
  getDetail: async (reservationId: number) => {
    const { data } = await apiClient.get<Reservation>(`/user/reservations/${reservationId}`)
    return data
  },
  cancel: async (reservationId: number) => {
    await apiClient.post(`/user/reservations/${reservationId}/cancel`)
  },

  /* ---------- P2: 예약금 ---------- */
  getRefundPreview: async (reservationId: number) => {
    const { data } = await apiClient.get(`/user/reservations/${reservationId}/refund-preview`)
    return data
  },
  /** 테이블 5분 임시 선점 */
  createHold: async (body: CreateHoldRequest) => {
    const { data } = await apiClient.post<ReservationHold>('/user/reservations/holds', body)
    return data
  },
  getHold: async (holdId: number) => {
    const { data } = await apiClient.get<ReservationHold>(`/user/reservations/holds/${holdId}`)
    return data
  },
  releaseHold: async (holdId: number) => {
    await apiClient.delete(`/user/reservations/holds/${holdId}`)
  },
}
