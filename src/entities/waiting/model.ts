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
  /** 앞선 팀 수 — 목록 화면용 */
  teamsAhead?: number
  /** 좌석 조건 (테이블석·바석·상관없음) */
  seatPreference?: string
  /** 예약자 이름 — 점주 화면용 */
  customerName?: string
  /** 호출 시각 */
  calledAt?: string
}

export const WAITING_STATUS_LABEL: Record<WaitingStatus, string> = {
  WAITING: '대기 중',
  CALLED: '입장 호출',
  SEATED: '착석 완료',
  CANCELED: '취소됨',
  NO_SHOW: '노쇼',
}

/** 입장 호출은 즉시 행동이 필요한 특수 상황이라 primary(노랑) 강조 */
export const WAITING_STATUS_TONE: Record<WaitingStatus, 'neutral' | 'brand' | 'primary' | 'danger'> = {
  WAITING: 'brand',
  CALLED: 'primary',
  SEATED: 'neutral',
  CANCELED: 'neutral',
  NO_SHOW: 'danger',
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
