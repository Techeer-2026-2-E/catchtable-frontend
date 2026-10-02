import type { Reservation } from '@/entities'
import { apiClient } from '@/shared/lib'

/**
 * 점주 예약 운영 API
 * TODO: 노션 API 명세(owner-reservations)가 아직 비어 있음 — 아래 경로는 임시, 백엔드 확정 후 수정
 * 기능 명세: 예약 현황 조회·처리 / 확정 상태 조회 / 점주 취소 / 방문 확인 / 노쇼 처리
 */
export const ownerReservationApi = {
  getList: async (storeId: number, params?: { date?: string }) => {
    const { data } = await apiClient.get<Reservation[]>(`/owner/stores/${storeId}/reservations`, { params })
    return data
  },
  cancel: async (reservationId: number) => {
    await apiClient.post(`/owner/reservations/${reservationId}/cancel`)
  },
  markVisited: async (reservationId: number) => {
    await apiClient.post(`/owner/reservations/${reservationId}/visit`)
  },
  markNoShow: async (reservationId: number) => {
    await apiClient.post(`/owner/reservations/${reservationId}/no-show`)
  },
}
