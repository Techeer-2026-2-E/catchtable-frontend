export const env = {
  /** 예: '/api' → 요청 경로는 '/user/...', '/owner/...' 로 작성 */
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api',
  /**
   * 목 API(MSW) 사용 여부
   * - 개발 서버: 기본 켜짐. 실제 백엔드에 붙일 때는 .env 에 VITE_API_MOCKING=false
   * - 배포 빌드: 기본 꺼짐. 데모 배포처럼 목 API 로 띄우려면 VITE_API_MOCKING=true
   */
  apiMocking:
    import.meta.env.VITE_API_MOCKING === 'true' ||
    (import.meta.env.DEV && import.meta.env.VITE_API_MOCKING !== 'false'),
} as const
