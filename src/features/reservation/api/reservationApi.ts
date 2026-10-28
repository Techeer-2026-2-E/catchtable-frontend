import type { Availability, HistoryItem, HistoryStatus, HistoryType, Reservation } from '@/entities'
import { apiClient } from '@/shared/lib'

/** 백엔드 CreateReservationRequest */
export interface CreateReservationRequest {
  storeId: number
  /** ISO OffsetDateTime — toStoreDateTime(date, time) */
  reservationStartAt: string
  partySize: number
}

/** 예약·웨이팅 내역 필터 — 생략하면 전체 */
export interface HistoryParams {
  type?: HistoryType
  status?: HistoryStatus
}

export const reservationApi = {
  /** 예약 가능 시간·잔여 테이블 */
  getAvailability: async (storeId: number, params: { date: string; partySize: number }) => {
    const { data } = await apiClient.get<Availability>(`/user/stores/${storeId}/availability`, { params })
    return data
  },
  /** 예약 생성 — 테이블 자동 배정 후 즉시 확정(201) */
  create: async (body: CreateReservationRequest) => {
    const { data } = await apiClient.post<Reservation>('/user/reservations', body)
    return data
  },
  /** 예약·웨이팅 내역 (마이다이닝) — 예약과 웨이팅을 함께 반환 */
  getHistory: async (params?: HistoryParams) => {
    const { data } = await apiClient.get<HistoryItem[]>('/user/reservations', { params })
    return data
  },
  /** 예약 상세 */
  getDetail: async (reservationId: number) => {
    const { data } = await apiClient.get<Reservation>(`/user/reservations/${reservationId}`)
    return data
  },
  /** 예약 취소 — 본문 없음, 재취소는 기존 결과 반환 */
  cancel: async (reservationId: number) => {
    const { data } = await apiClient.post<Reservation>(`/user/reservations/${reservationId}/cancel`)
    return data
  },
}
