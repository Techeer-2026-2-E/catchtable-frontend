import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { env } from '@/shared/config'
import { tokenStorage } from './tokenStorage'

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 10_000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.get()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/* ---------- 401 → 토큰 재발급 (POST /user/auth/reissue) ---------- */

const REISSUE_URL = '/user/auth/reissue'
let reissuePromise: Promise<string> | null = null

const reissueAccessToken = async () => {
  // 동시에 여러 요청이 401을 받아도 재발급은 한 번만
  reissuePromise ??= axios
    .post<{ accessToken: string }>(`${env.apiBaseUrl}${REISSUE_URL}`, null, { withCredentials: true })
    .then(({ data }) => {
      tokenStorage.set(data.accessToken)
      return data.accessToken
    })
    .finally(() => {
      reissuePromise = null
    })
  return reissuePromise
}

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean }

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined

    if (error.response?.status !== 401 || !original || original._retry || original.url === REISSUE_URL) {
      return Promise.reject(error)
    }

    original._retry = true
    try {
      const token = await reissueAccessToken()
      original.headers.Authorization = `Bearer ${token}`
      return apiClient(original)
    } catch (reissueError) {
      tokenStorage.clear()
      window.dispatchEvent(new Event('auth:logout'))
      return Promise.reject(reissueError)
    }
  },
)
