const ACCESS_TOKEN_KEY = 'accessToken'
const MEMBER_ID_KEY = 'memberId'

const read = (key: string) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
const write = (key: string, value: string | null) => {
  try {
    if (value == null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    /* 저장소 사용 불가(사생활 보호 모드 등) — 무시 */
  }
}

/**
 * 액세스 토큰 저장소 — shared 레이어가 features(auth)를 참조하지 않도록 분리
 * 리프레시 토큰은 HttpOnly 쿠키로 받는 것을 가정 (백엔드와 확정 필요)
 */
export const tokenStorage = {
  get: () => read(ACCESS_TOKEN_KEY),
  set: (token: string) => write(ACCESS_TOKEN_KEY, token),
  clear: () => {
    write(ACCESS_TOKEN_KEY, null)
    write(MEMBER_ID_KEY, null)
  },
}

/**
 * 로그인 회원 id — 백엔드가 인증 도입 전까지 X-Member-Id 헤더로 회원을 식별하므로 함께 보관
 * TODO(인증 API 확정 후): 토큰만으로 식별하게 되면 제거
 */
export const memberIdStorage = {
  get: () => read(MEMBER_ID_KEY),
  set: (memberId: number) => write(MEMBER_ID_KEY, String(memberId)),
}
