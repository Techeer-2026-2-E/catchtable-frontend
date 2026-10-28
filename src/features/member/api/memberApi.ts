import type { MemberProfile } from '@/entities'
import { apiClient } from '@/shared/lib'

/** 백엔드 MemberUpdateRequest — phone 은 "010-1234-5678" 형식 */
export interface UpdateMeRequest {
  name?: string
  phone?: string
}

/** 내 정보 — 고객만 사용 가능 (점주는 403 FORBIDDEN_MEMBER_TYPE) */
export const memberApi = {
  /** GET /api/user/members/me */
  getMe: async () => {
    const { data } = await apiClient.get<MemberProfile>('/user/members/me')
    return data
  },
  /** PATCH /api/user/members/me */
  updateMe: async (body: UpdateMeRequest) => {
    const { data } = await apiClient.patch<MemberProfile>('/user/members/me', body)
    return data
  },
}
