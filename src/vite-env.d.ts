/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_API_PROXY_TARGET?: string
  /** 'true' | 'false' — 목 API(MSW) 사용 여부 */
  readonly VITE_API_MOCKING?: string
  /** [임시] 실제 연동 시 점주 매장 id 목록 (쉼표 구분) */
  readonly VITE_OWNER_STORE_IDS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
