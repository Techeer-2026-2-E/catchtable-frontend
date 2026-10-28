const mocking = import.meta.env.VITE_API_MOCKING

export const env = {
  /** 예: '/api' → 요청 경로는 '/user/...', '/owner/...' 로 작성 */
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api',
  /**
   * 목 API(MSW) 사용 여부
   * - 개발 서버: 기본 켜짐. 실제 백엔드에 붙일 때는 .env 에 VITE_API_MOCKING=false
   * - 배포 빌드: 기본 꺼짐. 데모 배포처럼 목 API 로 띄우려면 VITE_API_MOCKING=true
   * - 'backend': 목 API 를 쓰되 백엔드 dev 에 있는 기능만 화면에 노출 (실제 연동 전 미리보기)
   */
  apiMocking: mocking === 'true' || mocking === 'backend' || (import.meta.env.DEV && mocking !== 'false'),
  /** 실제 백엔드가 제공하는 기능만 사용 — 실제 연동 또는 'backend' 미리보기 */
  backendOnly: mocking === 'backend' || mocking === 'false' || (!import.meta.env.DEV && mocking !== 'true'),
  /**
   * [임시] 점주 "내 매장 목록" API(GET /api/owner/stores)가 백엔드에 없어서 실제 연동 시 매장 id 를 지정
   * 쉼표로 구분 (기본: 백엔드 local-seed 의 매장 1, 'backend' 미리보기에서는 목 데이터의 점주 매장 2·4)
   */
  ownerStoreIds: (import.meta.env.VITE_OWNER_STORE_IDS ?? (mocking === 'backend' ? '2,4' : '1'))
    .split(',')
    .map((id) => Number(id.trim()))
    .filter((id) => Number.isFinite(id) && id > 0),
} as const
