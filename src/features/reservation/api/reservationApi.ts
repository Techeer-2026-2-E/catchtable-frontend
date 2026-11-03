import type { Availability, HistoryItem, HistoryStatus, HistoryType, RefundPreview, Reservation, ReservationHold } from '@/entities'
import { apiClient, PG_TIMEOUT } from '@/shared/lib'

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
  /** 선점 생성 — 유료 예약의 시작. 테이블을 5분간 잡아둠(201) */
  createHold: async (body: CreateReservationRequest) => {
    const { data } = await apiClient.post<ReservationHold>('/user/reservations/holds', body)
    return data
  },
  /** 선점 조회 — 최초 만료시각을 유지하고 서버 시각·남은 초를 함께 줌 */
  getHold: async (holdId: number) => {
    const { data } = await apiClient.get<ReservationHold>(`/user/reservations/holds/${holdId}`)
    return data
  },
  /** 선점 해제 — 사용자가 명시적으로 취소할 때만 호출. 승인 진행·결과 불명이면 409 */
  releaseHold: async (holdId: number) => {
    await apiClient.delete(`/user/reservations/holds/${holdId}`)
  },
  /** 환불 예상액 — 본인·시작 전·미입장 확정 예약만 */
  getRefundPreview: async (reservationId: number) => {
    const { data } = await apiClient.get<RefundPreview>(`/user/reservations/${reservationId}/refund-preview`)
    return data
  },
  /**
   * 예약 취소 — 본문 없음, 재취소는 기존 결과 반환
   * 환불이 있으면 Idempotency-Key 를 함께 보냄. PG 응답을 기다리므로 시간 제한을 늘림
   */
  cancel: async (reservationId: number, idempotencyKey?: string) => {
    const { data } = await apiClient.post<Reservation>(`/user/reservations/${reservationId}/cancel`, undefined, {
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
      timeout: idempotencyKey ? PG_TIMEOUT : undefined,
    })
    return data
  },
}
