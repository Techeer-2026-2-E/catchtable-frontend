import type { Member, UserType } from '@/entities'
import { isFeatureAvailable } from '@/shared/config'
import { apiClient, memberIdStorage, UserFacingError } from '@/shared/lib'

/*
 * 인증 API — 노션 명세 "API 명세 (보류)(auth)" 경로 기준, 백엔드 미구현이라 목 API 로만 동작
 * 요청·응답 필드는 제안안 (백엔드와 확정 필요)
 * 실제 백엔드는 X-Member-Id 헤더로 회원을 식별하므로, 개발 중에는 memberLogin 으로 회원 id 를 지정
 */

/** 인증 API 가 없는 백엔드에서 로그인·회원가입을 시도한 경우 */
export const AUTH_UNAVAILABLE_MESSAGE = '로그인 API 가 아직 없어요. 아래 개발용 계정으로 둘러보세요'

export interface SignupRequest {
  email: string
  password: string
  name: string
  /** 010-1234-5678 */
  phone: string
  userType: UserType
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  member: Member
}

export const authApi = {
  /** 회원가입 — 201 */
  signup: async (body: SignupRequest) => {
    if (!isFeatureAvailable('auth')) throw new UserFacingError(AUTH_UNAVAILABLE_MESSAGE)
    await apiClient.post('/user/auth/signup', body)
  },
  /** 로그인 — 200, 토큰 발급 */
  login: async (body: LoginRequest) => {
    if (!isFeatureAvailable('auth')) throw new UserFacingError(AUTH_UNAVAILABLE_MESSAGE)
    const { data } = await apiClient.post<LoginResponse>('/user/auth/login', body)
    return data
  },
  /**
   * [개발용] 회원 id 로 식별 — 백엔드 X-Member-Id 방식
   * MemberResponse 에 회원 유형이 없어서 호출하는 쪽이 고객/점주를 지정
   */
  memberLogin: async ({
    memberId,
    userType,
    name,
  }: {
    memberId: number
    userType: UserType
    /** 점주용 표시 이름 — 백엔드 GET /user/members/me 는 고객만 허용(점주는 403 FORBIDDEN_MEMBER_TYPE) */
    name: string
  }): Promise<LoginResponse> => {
    memberIdStorage.set(memberId)
    if (userType === 'OWNER') return { accessToken: '', member: { id: memberId, name, phone: '', userType } }
    const { data } = await apiClient.get<Member>('/user/members/me')
    return { accessToken: '', member: { ...data, userType } }
  },
  /** 로그아웃 — 204 */
  logout: async () => {
    if (!isFeatureAvailable('auth')) return
    await apiClient.post('/user/auth/logout')
  },
  // 토큰 재발급(/user/auth/reissue)은 shared/lib/axios 인터셉터에서 처리
}
