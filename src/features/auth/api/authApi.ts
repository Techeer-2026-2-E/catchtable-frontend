import type { Member } from '@/entities'
import { apiClient } from '@/shared/lib'

export interface SignupRequest {
  email: string
  password: string
  name: string
  phone: string
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
