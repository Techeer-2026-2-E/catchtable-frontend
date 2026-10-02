import type { Waiting } from '@/entities'
import { apiClient } from '@/shared/lib'

/**
 * 점주 웨이팅 운영 API
 * TODO: 노션 API 명세(owner-waitings)가 아직 비어 있음 — 아래 경로는 임시, 백엔드 확정 후 수정
 * 기능 명세: 접수 시작·종료 / 대기 고객 목록 / 호출 / 착석 / 미응답·노쇼 / 점주 취소 / 도착 제한시간 설정
 */
export const ownerWaitingApi = {
  getList: async (storeId: number) => {
    const { data } = await apiClient.get<Waiting[]>(`/owner/stores/${storeId}/waitings`)
    return data
  },
  /** 웨이팅 접수 시작·종료 */
  setOpen: async (storeId: number, open: boolean) => {
    await apiClient.patch(`/owner/stores/${storeId}/waitings/status`, { open })
  },
  call: async (waitingId: number) => {
    await apiClient.post(`/owner/waitings/${waitingId}/call`)
  },
  seat: async (waitingId: number) => {
    await apiClient.post(`/owner/waitings/${waitingId}/seat`)
  },
  markNoShow: async (waitingId: number) => {
    await apiClient.post(`/owner/waitings/${waitingId}/no-show`)
  },
  cancel: async (waitingId: number) => {
    await apiClient.post(`/owner/waitings/${waitingId}/cancel`)
  },
}
