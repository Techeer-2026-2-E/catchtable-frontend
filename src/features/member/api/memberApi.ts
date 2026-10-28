import type { MemberProfile, NotificationSettings } from '@/entities'
import { apiClient } from '@/shared/lib'

/** 백엔드 MemberUpdateRequest — phone 은 "010-1234-5678" 형식 */
export interface UpdateMeRequest {
  name?: string
  phone?: string
}

export const memberApi = {
  /** GET /api/user/members/me — 백엔드 dev 구현 */
  getMe: async () => {
    const { data } = await apiClient.get<MemberProfile>('/user/members/me')
    return data
  },
  /** PATCH /api/user/members/me — 백엔드 dev 구현 */
  updateMe: async (body: UpdateMeRequest) => {
    const { data } = await apiClient.patch<MemberProfile>('/user/members/me', body)
    return data
  },
  /** 회원 탈퇴 — P2(보류) */
  withdraw: async () => {
    await apiClient.delete('/user/members/me')
  },
  /** [P2 · 경로 제안] 알림 수신 설정 */
  getNotificationSettings: async () => {
    const { data } = await apiClient.get<NotificationSettings>('/user/members/me/notification-settings')
    return data
  },
  updateNotificationSettings: async (body: Partial<NotificationSettings>) => {
    const { data } = await apiClient.patch<NotificationSettings>('/user/members/me/notification-settings', body)
    return data
  },
}
