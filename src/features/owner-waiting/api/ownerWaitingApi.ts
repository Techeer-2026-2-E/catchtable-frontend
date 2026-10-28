import type { OwnerWaiting, WaitingSettings } from '@/entities'
import { apiClient } from '@/shared/lib'

/**
 * 점주 웨이팅 운영 API — 노션 명세(owner-waitings) 경로 기준, 백엔드 미구현
 * 응답 필드는 제안 (OwnerWaiting, WaitingSettings)
 */
export const ownerWaitingApi = {
  /** 현재 대기 고객 목록 (진행 중 상태만) */
  getList: async (storeId: number) => {
    const { data } = await apiClient.get<OwnerWaiting[]>(`/owner/stores/${storeId}/waitings`)
    return data
  },
  /** [경로 제안] 운영 설정 조회 — 명세에는 PUT 만 있음 */
  getSettings: async (storeId: number) => {
    const { data } = await apiClient.get<WaitingSettings>(`/owner/stores/${storeId}/waitings/settings`)
    return data
  },
  /** 도착 제한시간·자동호출 설정 */
  updateSettings: async (storeId: number, body: Partial<WaitingSettings>) => {
    const { data } = await apiClient.put<WaitingSettings>(`/owner/stores/${storeId}/waitings/settings`, body)
    return data
  },
  /** 웨이팅 접수 시작 */
  open: async (storeId: number) => {
    const { data } = await apiClient.post<WaitingSettings>(`/owner/stores/${storeId}/waitings/open`)
    return data
  },
  /** 웨이팅 접수 종료 */
  close: async (storeId: number) => {
    const { data } = await apiClient.post<WaitingSettings>(`/owner/stores/${storeId}/waitings/close`)
    return data
  },
  /** 고객 호출 */
  call: async (waitingId: number) => {
    const { data } = await apiClient.post<OwnerWaiting>(`/owner/waitings/${waitingId}/call`)
    return data
  },
  /** [P2] 호출 재전송 — 도착 제한시간도 다시 시작 */
  recall: async (waitingId: number) => {
    const { data } = await apiClient.post<OwnerWaiting>(`/owner/waitings/${waitingId}/recall`)
    return data
  },
  /** 입장(착석) 처리 */
  enter: async (waitingId: number) => {
    const { data } = await apiClient.post<OwnerWaiting>(`/owner/waitings/${waitingId}/enter`)
    return data
  },
  /** 미응답·노쇼 처리 */
  markNoShow: async (waitingId: number) => {
    const { data } = await apiClient.post<OwnerWaiting>(`/owner/waitings/${waitingId}/no-show`)
    return data
  },
  /** 순번 연기 */
  defer: async (waitingId: number) => {
    const { data } = await apiClient.post<OwnerWaiting>(`/owner/waitings/${waitingId}/defer`)
    return data
  },
  /** 점주 취소 */
  cancel: async (waitingId: number) => {
    await apiClient.delete(`/owner/waitings/${waitingId}`)
  },
}
