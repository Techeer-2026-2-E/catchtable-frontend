const mocking = import.meta.env.VITE_API_MOCKING
const apiMocking = mocking === 'true' || (import.meta.env.DEV && mocking !== 'false')

export const env = {
  /** 예: '/api' → 요청 경로는 '/user/...', '/owner/...' 로 작성 */
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api',
  /**
   * 목 API(MSW) 사용 여부 — 목 API 는 백엔드 dev 와 같은 경로·응답만 제공
   * - 개발 서버: 기본 켜짐. 실제 백엔드에 붙일 때는 .env 에 VITE_API_MOCKING=false
   * - 배포 빌드: 기본 꺼짐. 데모 배포처럼 목 API 로 띄우려면 VITE_API_MOCKING=true
   */
  apiMocking,
  /**
   * Toss 결제창 클라이언트 키. 실제 API 모드에서는 키 없이는 결제를 시작하지 않는다
   * 서버의 TOSS_SECRET_KEY 와 짝인 테스트 키만 넣는다
   */
  tossClientKey: import.meta.env.VITE_TOSS_CLIENT_KEY ?? '',
  /**
   * 카카오맵 JavaScript 키. 비어 있으면 지도 화면이 키 없이 그리는 간이 지도로 대신한다
   * 카카오 개발자 콘솔 > 플랫폼 > Web 에 이 앱의 도메인(localhost:5173 포함)을 등록해야 지도가 뜬다
   */
  kakaoMapKey: import.meta.env.VITE_KAKAO_MAP_KEY ?? '',
  /** 개발 서버의 MSW 또는 명시적으로 선택한 로컬 fake PG 전용. 배포에서는 항상 꺼짐 */
  tossSimulation: import.meta.env.DEV && (apiMocking || import.meta.env.VITE_TOSS_SIMULATION === 'true'),
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
