import axios from 'axios'
import { env } from '@/shared/config'
import { memberIdStorage } from './memberIdStorage'

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
})

// 백엔드 dev 는 인증 대신 X-Member-Id 헤더로 회원을 식별 (LoginMemberArgumentResolver, 없으면 401)
apiClient.interceptors.request.use((config) => {
  const memberId = memberIdStorage.get()
  if (memberId) config.headers['X-Member-Id'] = memberId
  return config
})
