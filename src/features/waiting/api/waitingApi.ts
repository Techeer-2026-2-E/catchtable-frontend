import type { Waiting } from '@/entities'
import { apiClient } from '@/shared/lib'

/*
 * 웨이팅 API — 경로는 노션 명세(/api/user/waitings) 기준
 * 요청·응답 필드는 백엔드 feat/waiting-join 브랜치 DTO(WaitingCreateRequest·WaitingResponse) 기준
 * NOTE: 백엔드 브랜치는 현재 POST /api/stores/{storeId}/waitings 경로 — 머지 시 경로 확정 필요
 */

export interface RegisterWaitingRequest {
  storeId: number
  /** 1 ~ 20 */
  partyCount: number
  /** [목 전용] 좌석 조건 */
  seatPreference?: string
}

export const waitingApi = {
  /** 웨이팅 신청 — 신규 201 / 이미 대기 중이면 기존 웨이팅 200 */
  register: async (body: RegisterWaitingRequest) => {
    const { data } = await apiClient.post<Waiting>('/user/waitings', body)
    return data
  },
  /** [경로 제안] 내 웨이팅 목록 — 마이다이닝 */
  getList: async () => {
    const { data } = await apiClient.get<Waiting[]>('/user/waitings')
    return data
  },
  /** 대기순번·예상시간 조회 */
  getDetail: async (waitingId: number) => {
    const { data } = await apiClient.get<Waiting>(`/user/waitings/${waitingId}`)
    return data
  },
  /** 호출 수락·입장 확인 (도착했어요) */
  accept: async (waitingId: number) => {
    const { data } = await apiClient.post<Waiting>(`/user/waitings/${waitingId}/accept`)
    return data
  },
  /** 순번 연기 요청 (조금 늦어요) — 지정 횟수 내 */
  defer: async (waitingId: number) => {
    const { data } = await apiClient.post<Waiting>(`/user/waitings/${waitingId}/defer`)
    return data
  },
  /** 웨이팅 취소 */
  cancel: async (waitingId: number) => {
    await apiClient.delete(`/user/waitings/${waitingId}`)
  },
}
