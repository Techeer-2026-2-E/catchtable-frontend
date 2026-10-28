import type { Member, UserType } from '@/entities'
import { apiClient } from '@/shared/lib'

/*
 * 인증 API — 노션 명세 "API 명세 (보류)(auth)" 경로 기준, 백엔드 미구현이라 목 API 로만 동작
 * 요청·응답 필드는 제안안 (백엔드와 확정 필요)
 */

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
    await apiClient.post('/user/auth/signup', body)
  },
  /** 로그인 — 200, 토큰 발급 */
  login: async (body: LoginRequest) => {
    const { data } = await apiClient.post<LoginResponse>('/user/auth/login', body)
    return data
  },
  /** 로그아웃 — 204 */
  logout: async () => {
    await apiClient.post('/user/auth/logout')
  },
  // 토큰 재발급(/user/auth/reissue)은 shared/lib/axios 인터셉터에서 처리
}
