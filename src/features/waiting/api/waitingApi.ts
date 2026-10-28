import type { Waiting, WaitingRegistration, WaitingStatus, WaitingTermination } from '@/entities'
import { apiClient } from '@/shared/lib'

/*
 * 고객 웨이팅 API — 백엔드 dev 구현 (catchtable-backend dev@7d32049)
 * 내 웨이팅 목록은 별도 API 없이 예약·웨이팅 내역(GET /api/user/reservations?type=WAITING)을 사용
 */

/** WaitingCreateRequest */
export interface RegisterWaitingRequest {
  storeId: number
  /** 1 ~ 20 */
  partyCount: number
  /** [목 전용] 좌석 조건 — 백엔드는 무시 */
  seatPreference?: string
}

/** POST /{id}/accept 응답 — WaitingRespondResponse */
export interface WaitingRespondResult {
  waitingId: number
  status: WaitingStatus
  arrivalIntent: 'COMING'
  respondedAt: string
  expiresAt: string | null
}

export const waitingApi = {
  /** 웨이팅 신청 — 신규 201 / 같은 매장에 이미 진행 중이면 기존 웨이팅 200 */
  register: async (body: RegisterWaitingRequest) => {
    const { data } = await apiClient.post<WaitingRegistration>('/user/waitings', body)
    return data
  },
  /** 대기순번 조회 */
  getDetail: async (waitingId: number) => {
    const { data } = await apiClient.get<Waiting>(`/user/waitings/${waitingId}`)
    return data
  },
  /** 호출 응답 — 방문 예정(도착했어요). 상태가 CONFIRMED 로 바뀜 */
  accept: async (waitingId: number) => {
    const { data } = await apiClient.post<WaitingRespondResult>(`/user/waitings/${waitingId}/accept`)
    return data
  },
  /** [목 전용] 순번 연기 요청 (조금 늦어요) — 백엔드 미구현 */
  defer: async (waitingId: number) => {
    const { data } = await apiClient.post<Waiting>(`/user/waitings/${waitingId}/defer`)
    return data
  },
  /** 웨이팅 취소 — 종료 결과 반환 */
  cancel: async (waitingId: number) => {
    const { data } = await apiClient.delete<WaitingTermination>(`/user/waitings/${waitingId}`)
    return data
  },
}
