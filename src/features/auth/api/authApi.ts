import type { Member, UserType } from '@/entities'
import { apiClient, memberIdStorage } from '@/shared/lib'

/*
 * 백엔드 dev 에는 로그인·회원가입 API 가 없고 X-Member-Id 헤더로 회원을 식별한다.
 * 시작 화면에서 고른 회원 id 를 저장해 두고 모든 요청에 붙인다 (운영 인증 아님).
 */

export interface StartAsRequest {
  memberId: number
  userType: UserType
  /** 점주 표시 이름 — GET /user/members/me 는 고객만 허용(점주는 403 FORBIDDEN_MEMBER_TYPE) */
  name: string
}

export const authApi = {
  /** 회원 id 로 시작 — 고객은 GET /api/user/members/me 로 이름·연락처를 받음 */
  startAs: async ({ memberId, userType, name }: StartAsRequest): Promise<Member> => {
    memberIdStorage.set(memberId)
    if (userType === 'OWNER') return { id: memberId, name, phone: '', userType }
    try {
      const { data } = await apiClient.get<Omit<Member, 'userType'>>('/user/members/me')
      return { ...data, userType }
    } catch (error) {
      memberIdStorage.clear()
      throw error
    }
  },
}
