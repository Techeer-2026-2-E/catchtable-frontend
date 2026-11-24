/*
 * 웨이팅 신청 요청 키(Idempotency-Key) — 대기표 방식 매장은 키가 필수이고,
 * 결과를 모르면(네트워크 끊김, 503) 같은 키로 다시 보내야 중복 접수가 없다
 * 회원, 매장, 인원이 같으면 같은 키를 쓰고, 인원을 바꾸면 새 키를 만든다 (같은 키로 인원을 바꾸면 409)
 * 시크릿이 아니라 요청 식별값이라 localStorage 에 둔다
 */
interface Saved {
  key: string
  partyCount: number
}

const storageKey = (memberId: number, storeId: number) => `catchtable:waiting-intake-key:${memberId}:${storeId}`

const read = (memberId: number, storeId: number): Saved | null => {
  try {
    const raw = localStorage.getItem(storageKey(memberId, storeId))
    return raw ? (JSON.parse(raw) as Saved) : null
  } catch {
    return null
  }
}

export const waitingIntakeKeyStorage = {
  /** 같은 인원으로 보낸 적이 있으면 그 키, 아니면 새로 만들어 보관 */
  get: (memberId: number, storeId: number, partyCount: number) => {
    const saved = read(memberId, storeId)
    if (saved && saved.partyCount === partyCount) return saved.key
    const key = crypto.randomUUID()
    try {
      localStorage.setItem(storageKey(memberId, storeId), JSON.stringify({ key, partyCount } satisfies Saved))
    } catch {
      // 보관 실패해도 이번 요청은 진행
    }
    return key
  },
  /** 결과가 확정되면(번호 발급, 거절, 취소) 다음 신청은 새 키로 */
  clear: (memberId: number, storeId: number) => {
    try {
      localStorage.removeItem(storageKey(memberId, storeId))
    } catch {
      // 무시
    }
  },
}
