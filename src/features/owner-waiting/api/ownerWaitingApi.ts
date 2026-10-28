import type { OwnerWaiting, WaitingEndReason, WaitingSettings, WaitingStatus, WaitingTermination } from '@/entities'
import { env } from '@/shared/config'
import { apiClient } from '@/shared/lib'

/*
 * 점주 웨이팅 운영 API — 백엔드 dev 구현 (catchtable-backend dev@7d32049)
 */

/** 운영 설정 변경 — WaitingPolicyRequest */
export interface UpdateWaitingSettingsRequest {
  arrivalLimitMinutes: number
}

/** 미응답·노쇼 처리 — OwnerWaitingNoShowRequest */
export interface OwnerWaitingNoShowRequest {
  reason: Extract<WaitingEndReason, 'NO_RESPONSE' | 'NO_SHOW'>
  /** 공백 불가, 300자 이내 */
  detail: string
}

/** POST /call 응답 — WaitingCallResponse */
export interface WaitingCallResult {
  waitingId: number
  status: WaitingStatus
  waitNumber: number
  callCount: number
  calledAt: string
  expiresAt: string
}

export const ownerWaitingApi = {
  /** 오늘(한국 시간) 진행 중인 대기 고객 목록 */
  getList: async (storeId: number) => {
    const { data } = await apiClient.get<OwnerWaiting[]>(`/owner/stores/${storeId}/waitings`)
    return data
  },
  /** 운영 설정 조회 (접수 여부·도착 제한시간) */
  getSettings: async (storeId: number) => {
    const { data } = await apiClient.get<WaitingSettings>(`/owner/stores/${storeId}/waitings/settings`)
    return data
  },
  /** 도착 제한시간 변경 */
  updateSettings: async (storeId: number, body: UpdateWaitingSettingsRequest) => {
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
    const { data } = await apiClient.post<WaitingCallResult>(`/owner/waitings/${waitingId}/call`)
    return data
  },
  /** 입장(착석) 처리 — WaitingEnterResponse */
  enter: async (waitingId: number) => {
    const { data } = await apiClient.post<{ waitingId: number; status: WaitingStatus; enteredAt: string }>(
      `/owner/waitings/${waitingId}/enter`,
    )
    return data
  },
  /** 미응답·노쇼 처리 — 사유 필수, 종료 결과 반환 (상태 NO_SHOW) */
  markNoShow: async ({ waitingId, body }: { waitingId: number; body: OwnerWaitingNoShowRequest }) => {
    const { data } = await apiClient.post<WaitingTermination>(`/owner/waitings/${waitingId}/no-show`, body)
    return data
  },
  /** 점주 취소 — 사유 필수(본문), 204 */
  cancel: async ({ waitingId, reason }: { waitingId: number; reason: string }) => {
    await apiClient.delete(`/owner/waitings/${waitingId}`, { data: { reason } })
  },
  /**
   * 점주 실시간 구독(SSE) — WAITING_CHANGED 가 오면 목록을 다시 조회
   * EventSource 는 헤더를 못 붙여서 회원 id 를 쿼리로 전달
   */
  subscribeUrl: (storeId: number, memberId: number) => `${env.apiBaseUrl}/owner/stores/${storeId}/waitings/subscribe?memberId=${memberId}`,
}
