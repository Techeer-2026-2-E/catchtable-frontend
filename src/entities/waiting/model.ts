/** 웨이팅 상태 — 기능 명세(호출 / 착석 / 취소 / 미응답·노쇼 만료) 기준 */
export type WaitingStatus = 'WAITING' | 'CALLED' | 'SEATED' | 'CANCELED' | 'NO_SHOW'

export interface Waiting {
  id: number
  storeId: number
  storeName: string
  waitingNumber: number
  partySize: number
  status: WaitingStatus
  createdAt: string
}

/** 대기순번 조회 (GET /user/waitings/{waitingId}) · 실시간 갱신 이벤트 */
export interface WaitingPosition {
  waitingId: number
  /** 현재 순번 */
  position: number
  /** 앞선 팀 수 */
  teamsAhead: number
  /** 예상 대기시간(분) — P2 */
  estimatedMinutes?: number
  status: WaitingStatus
  /** 호출된 경우 도착 제한 시각 */
  callExpiresAt?: string
}
