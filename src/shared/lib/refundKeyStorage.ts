/*
 * 환불 멱등키 — 결과 불명이면 같은 키로 다시 요청해야 이중 환불이 없으므로 성공할 때까지 브라우저에 보관
 * 시크릿이 아니라 요청 식별값이라 localStorage 에 둔다
 */
type RefundKind = 'customer-cancel' | 'owner-cancel' | 'unconfirmed-refund' | 'partial-refund'

const storageKey = (kind: RefundKind, reservationId: number) => `catchtable:refund-key:${kind}:${reservationId}`

export const refundKeyStorage = {
  /** 진행 중인 키가 있을 때만 반환 */
  peek: (kind: RefundKind, reservationId: number) => {
    try {
      return localStorage.getItem(storageKey(kind, reservationId))
    } catch {
      return null
    }
  },
  /** 있으면 그대로, 없으면 새로 만들어 보관 */
  get: (kind: RefundKind, reservationId: number) => {
    const existing = refundKeyStorage.peek(kind, reservationId)
    if (existing) return existing
    const key = crypto.randomUUID()
    try {
      localStorage.setItem(storageKey(kind, reservationId), key)
    } catch {
      // 보관 실패해도 이번 요청은 진행
    }
    return key
  },
  clear: (kind: RefundKind, reservationId: number) => {
    try {
      localStorage.removeItem(storageKey(kind, reservationId))
    } catch {
      // 무시
    }
  },
}
