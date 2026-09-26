export const env = {
  /** 예: '/api' → 요청 경로는 '/user/...', '/owner/...' 로 작성 */
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api',
} as const
