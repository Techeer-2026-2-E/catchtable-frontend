/** 예약 상태 — 기능 명세(자동 확정 / 취소 / 방문 확인 / 자동 이용 완료 / 노쇼) 기준 */
export type ReservationStatus = 'CONFIRMED' | 'CANCELED' | 'VISITED' | 'COMPLETED' | 'NO_SHOW'

export interface Reservation {
  id: number
  storeId: number
  storeName: string
  /** YYYY-MM-DD */
  date: string
  /** HH:mm */
  time: string
  partySize: number
  status: ReservationStatus
  tableNumber?: number
  createdAt: string
}

/** P2: 예약금 결제 중 테이블 임시 선점 */
export interface ReservationHold {
  holdId: number
  expiresAt: string
}
