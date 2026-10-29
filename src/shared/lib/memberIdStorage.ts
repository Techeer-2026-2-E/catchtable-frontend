const MEMBER_ID_KEY = 'memberId'

const read = () => {
  try {
    return localStorage.getItem(MEMBER_ID_KEY)
  } catch {
    return null
  }
}
const write = (value: string | null) => {
  try {
    if (value == null) localStorage.removeItem(MEMBER_ID_KEY)
    else localStorage.setItem(MEMBER_ID_KEY, value)
  } catch {
    /* 저장소 사용 불가(사생활 보호 모드 등) — 무시 */
  }
}

/**
 * 시작 화면에서 고른 회원 id — 백엔드는 인증 API 없이 X-Member-Id 헤더로 회원을 식별
 * (shared 레이어가 features(auth)를 참조하지 않도록 분리)
 */
export const memberIdStorage = {
  get: read,
  set: (memberId: number) => write(String(memberId)),
  clear: () => write(null),
}
