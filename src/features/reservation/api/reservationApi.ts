import type {
  Availability,
  HistoryItem,
  HistoryStatus,
  HistoryType,
  RefundPreview,
  Reservation,
  ReservationHold,
  TableType,
} from '@/entities'
import { apiClient } from '@/shared/lib'

/** 백엔드 CreateReservationRequest */
export interface CreateReservationRequest {
  storeId: number
  /** ISO OffsetDateTime — toStoreDateTime(date, time) */
  reservationStartAt: string
  partySize: number
  /** [목 전용] 선호 좌석 타입 — 백엔드는 아직 타입 구분 없이 자동 배정 */
  preferredTableType?: TableType
  /** [목 전용] 요청사항 */
  request?: string
  /** [목 전용·P2] 예약금 결제 후 확정하는 경우의 선점 id — 백엔드는 결제 승인으로 확정 예정 */
  holdId?: number
}

/** 예약·웨이팅 내역 필터 — 생략하면 전체 */
export interface HistoryParams {
  type?: HistoryType
  status?: HistoryStatus
}

/** [P2] 테이블 임시 선점 요청 */
export interface CreateHoldRequest {
  storeId: number
  reservationStartAt: string
  partySize: number
}

export const reservationApi = {
  /** 예약 가능 시간·잔여 테이블 — 백엔드 dev 구현 */
  getAvailability: async (storeId: number, params: { date: string; partySize: number }) => {
    const { data } = await apiClient.get<Availability>(`/user/stores/${storeId}/availability`, { params })
    return data
  },
  /** 예약 생성 — 테이블 자동 배정 후 즉시 확정(201) — 백엔드 dev 구현 */
  create: async (body: CreateReservationRequest) => {
    const { data } = await apiClient.post<Reservation>('/user/reservations', body)
    return data
  },
  /** 예약·웨이팅 내역 (마이다이닝) — 백엔드 dev 구현, 예약과 웨이팅을 함께 반환 */
  getHistory: async (params?: HistoryParams) => {
    const { data } = await apiClient.get<HistoryItem[]>('/user/reservations', { params })
    return data
  },
  /** 예약 상세 — 백엔드 dev 구현 */
  getDetail: async (reservationId: number) => {
    const { data } = await apiClient.get<Reservation>(`/user/reservations/${reservationId}`)
    return data
  },
  /** 예약 취소 — 본문 없음, 재취소는 기존 결과 반환 — 백엔드 dev 구현 */
  cancel: async (reservationId: number) => {
    const { data } = await apiClient.post<Reservation>(`/user/reservations/${reservationId}/cancel`)
    return data
  },

  /* ---------- 선점은 백엔드 dev 구현, 환불 예상액은 P2 목 계약 ---------- */
  getRefundPreview: async (reservationId: number) => {
    const { data } = await apiClient.get<RefundPreview>(`/user/reservations/${reservationId}/refund-preview`)
    return data
  },
  /** 테이블 5분 임시 선점 — PENDING_PAYMENT 예약 생성 (실제 테이블은 서버가 배정) */
  createHold: async (body: CreateHoldRequest) => {
    const { data } = await apiClient.post<ReservationHold>('/user/reservations/holds', body)
    return data
  },
  getHold: async (holdId: number) => {
    const { data } = await apiClient.get<ReservationHold>(`/user/reservations/holds/${holdId}`)
    return data
  },
  /** 선점 해제 — 204, 반복 호출해도 같은 결과 */
  releaseHold: async (holdId: number) => {
    await apiClient.delete(`/user/reservations/holds/${holdId}`)
  },
}
