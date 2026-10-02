import type { Waiting, WaitingPosition } from '@/entities'
import { apiClient } from '@/shared/lib'

export interface RegisterWaitingRequest {
  storeId: number
  partySize: number
}

export const waitingApi = {
  /** 웨이팅 신청 */
  register: async (body: RegisterWaitingRequest) => {
    const { data } = await apiClient.post<Waiting>('/user/waitings', body)
    return data
  },
  /** 대기순번·예상시간 조회 */
  getPosition: async (waitingId: number) => {
    const { data } = await apiClient.get<WaitingPosition>(`/user/waitings/${waitingId}`)
    return data
  },
  /** 호출 수락·입장 확인 */
  accept: async (waitingId: number) => {
    await apiClient.post(`/user/waitings/${waitingId}/accept`)
  },
  /** 순번 연기 */
  defer: async (waitingId: number) => {
    await apiClient.post(`/user/waitings/${waitingId}/defer`)
  },
  /** 웨이팅 취소 */
  cancel: async (waitingId: number) => {
    await apiClient.delete(`/user/waitings/${waitingId}`)
  },
  /**
   * 대기순번 실시간 구독(SSE) 경로
   * TODO: API 명세에 아직 없음 — 백엔드와 경로 확정 필요
   */
  subscribePath: (waitingId: number) => `/user/waitings/${waitingId}/subscribe`,
}
