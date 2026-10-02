const ACCESS_TOKEN_KEY = 'accessToken'

/**
 * 액세스 토큰 저장소 — shared 레이어가 features(auth)를 참조하지 않도록 분리
 * 리프레시 토큰은 HttpOnly 쿠키로 받는 것을 가정 (백엔드와 확정 필요)
 */
export const tokenStorage = {
  get: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  set: (token: string) => localStorage.setItem(ACCESS_TOKEN_KEY, token),
  clear: () => localStorage.removeItem(ACCESS_TOKEN_KEY),
}
