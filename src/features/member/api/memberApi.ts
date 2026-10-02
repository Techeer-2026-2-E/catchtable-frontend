import type { Member } from '@/entities'
import { apiClient } from '@/shared/lib'

export interface UpdateMeRequest {
  name?: string
  phone?: string
}

export const memberApi = {
  getMe: async () => {
    const { data } = await apiClient.get<Member>('/user/members/me')
    return data
  },
  updateMe: async (body: UpdateMeRequest) => {
    const { data } = await apiClient.patch<Member>('/user/members/me', body)
    return data
  },
  /** 회원 탈퇴 — P2(보류) */
  withdraw: async () => {
    await apiClient.delete('/user/members/me')
  },
}
