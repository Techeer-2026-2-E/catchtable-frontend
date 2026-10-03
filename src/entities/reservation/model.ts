import type { BadgeTone } from '@/shared/ui'

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
  /** 예약자 이름 — 점주 화면용 */
  customerName?: string
  /** 좌석 타입 라벨 (룸·홀·바) */
  tableTypeLabel?: string
}

export const RESERVATION_STATUS_LABEL: Record<ReservationStatus, string> = {
  CONFIRMED: '예약 확정',
  VISITED: '방문 중',
  COMPLETED: '이용 완료',
  CANCELED: '취소됨',
  NO_SHOW: '노쇼',
}

/**
 * 상태 배지 톤 — 포인트 컬러 사용을 줄이기 위해
 * 진행 중인 상태만 brand, 예외(노쇼)만 danger, 나머지는 neutral
 */
export const RESERVATION_STATUS_TONE: Record<ReservationStatus, BadgeTone> = {
  CONFIRMED: 'brand',
  VISITED: 'brand',
  COMPLETED: 'neutral',
  CANCELED: 'neutral',
  NO_SHOW: 'danger',
}

/** P2: 예약금 결제 중 테이블 임시 선점 */
export interface ReservationHold {
  holdId: number
  expiresAt: string
}
