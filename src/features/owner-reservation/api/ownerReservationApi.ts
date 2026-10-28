import type { OwnerReservation, ReservationStatus } from '@/entities'
import { apiClient } from '@/shared/lib'

/** OwnerReservationActionRequest — 취소·노쇼 사유 (필수, 500자 이내) */
export interface OwnerReservationActionRequest {
  reason: string
}

/** [P2] 예약 변경 — PATCH /api/owner/reservations/{id} (노션 명세, 필드는 제안) */
export interface ChangeReservationRequest {
  reservationStartAt?: string
  partySize?: number
  tableId?: number
}

/** 점주 예약 운영 API — 백엔드 dev 구현 (OwnerReservationController) */
export const ownerReservationApi = {
  /** 날짜별 예약 현황 — status 를 주면 해당 상태만 */
  getList: async (storeId: number, params: { date: string; status?: ReservationStatus }) => {
    const { data } = await apiClient.get<OwnerReservation[]>(`/owner/stores/${storeId}/reservations`, { params })
    return data
  },
  getDetail: async (reservationId: number) => {
    const { data } = await apiClient.get<OwnerReservation>(`/owner/reservations/${reservationId}`)
    return data
  },
  cancel: async (reservationId: number, body: OwnerReservationActionRequest) => {
    const { data } = await apiClient.post<OwnerReservation>(`/owner/reservations/${reservationId}/cancel`, body)
    return data
  },
  /** 방문 확인 — checkedInAt 기록 (상태는 CONFIRMED 유지, 이용시간 지나면 COMPLETED) */
  enter: async (reservationId: number) => {
    const { data } = await apiClient.post<OwnerReservation>(`/owner/reservations/${reservationId}/enter`)
    return data
  },
  /** 노쇼 — 예약 시각 + 도착 유예시간 이후에만 가능 */
  markNoShow: async (reservationId: number, body: OwnerReservationActionRequest) => {
    const { data } = await apiClient.post<OwnerReservation>(`/owner/reservations/${reservationId}/no-show`, body)
    return data
  },
  /** [P2] 예약 변경 */
  change: async (reservationId: number, body: ChangeReservationRequest) => {
    const { data } = await apiClient.patch<OwnerReservation>(`/owner/reservations/${reservationId}`, body)
    return data
  },
}
