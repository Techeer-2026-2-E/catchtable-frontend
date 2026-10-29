const mocking = import.meta.env.VITE_API_MOCKING

export const env = {
  /** 예: '/api' → 요청 경로는 '/user/...', '/owner/...' 로 작성 */
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api',
  /**
   * 목 API(MSW) 사용 여부 — 목 API 는 백엔드 dev 와 같은 경로·응답만 제공
   * - 개발 서버: 기본 켜짐. 실제 백엔드에 붙일 때는 .env 에 VITE_API_MOCKING=false
   * - 배포 빌드: 기본 꺼짐. 데모 배포처럼 목 API 로 띄우려면 VITE_API_MOCKING=true
   */
  apiMocking: mocking === 'true' || (import.meta.env.DEV && mocking !== 'false'),
  /**
   * [임시] 점주 "내 매장 목록" API 가 백엔드에 없어서 매장 id 를 지정 — 쉼표로 구분
   * 기본: 실제 백엔드는 scripts/local-seed.sql 의 매장 1, 목 API 는 점주(회원 2)의 매장 2·4
   */
  ownerStoreIds: (
    import.meta.env.VITE_OWNER_STORE_IDS ?? (mocking === 'true' || (import.meta.env.DEV && mocking !== 'false') ? '2,4' : '1')
  )
    .split(',')
    .map((id) => Number(id.trim()))
    .filter((id) => Number.isFinite(id) && id > 0),
} as const
