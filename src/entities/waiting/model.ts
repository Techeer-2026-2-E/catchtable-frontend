import type { BadgeTone } from '@/shared/ui'

/*
 * 웨이팅 도메인 타입 — 백엔드 dev waiting/dto 기준 (catchtable-backend dev@7d32049)
 * 고객 경로 /api/user/waitings, 점주 경로 /api/owner/...
 */

/** waiting.entity.WaitingStatus — 웨이팅은 CANCELED 철자 (예약은 CANCELLED) */
export type WaitingStatus =
  | 'WAITING' // 대기 중
  | 'CALLED' // 입장 호출됨
  | 'CONFIRMED' // 도착 의사 응답 (방문 예정)
  | 'SEATED' // 착석 완료
  | 'CANCELED' // 취소 (고객/점주)
  | 'NO_SHOW' // 미응답·노쇼·자동 만료 (알림 이벤트 이름은 WAITING_EXPIRED)

/** 진행 중 상태 */
export const ACTIVE_WAITING_STATUSES: WaitingStatus[] = ['WAITING', 'CALLED', 'CONFIRMED']

/** 웨이팅 종료 사유 — waiting.entity.WaitingEndReason */
export type WaitingEndReason = 'OWNER_CANCELED' | 'CUSTOMER_CANCELED' | 'NO_RESPONSE' | 'NO_SHOW' | 'AUTO_EXPIRED'

/** POST /api/user/waitings 응답 — WaitingResponse (처음 신청 201, 이미 진행 중이면 200) */
export interface WaitingRegistration {
  waitingId: number
  storeId: number
  waitNumber: number
  partyCount: number
  status: WaitingStatus
  teamsAhead: number
}

/** GET /api/user/waitings/{waitingId} — WaitingPositionResponse */
export interface Waiting {
  waitingId: number
  storeId: number
  storeName: string
  /** 웨이팅 날짜 (YYYY-MM-DD, 한국 시간) */
  waitingDate: string
  /** 대기번호 */
  waitNumber: number
  /** 현재 순번 (앞 팀 수 + 1) — 진행 중이 아니면 null */
  currentPosition: number | null
  /** 내 앞 대기 팀 수 — 진행 중이 아니면 null */
  teamsAhead: number | null
  /** 인원수 */
  partyCount: number
  status: WaitingStatus
  /** 호출 시각 */
  calledAt: string | null
  /** 호출 응답·입장 제한 시각 */
  expiresAt: string | null
}

/** 종료 결과 — 고객 취소·점주 노쇼 응답 (WaitingTerminationResponse) */
export interface WaitingTermination {
  waitingId: number
  status: WaitingStatus
  reason: WaitingEndReason
  detail: string | null
  endedAt: string
}

/** 점주용 대기 고객 — GET /api/owner/stores/{storeId}/waitings (OwnerWaitingResponse) */
export interface OwnerWaiting {
  id: number
  storeId: number
  storeName: string
  waitingNumber: number
  partySize: number
  status: WaitingStatus
  customerName: string
  createdAt: string
  /** 설정·인원이 맞는 테이블 — 실제 공석 보장은 아님 */
  compatibleTables: { id: number; tableNumber: number; minCapacity: number; capacity: number; status: 'ACTIVE' | 'INACTIVE' }[]
  calledAt: string | null
  callExpiresAt: string | null
  /** 고객이 도착 의사를 응답한 시각 */
  respondedAt: string | null
  arrivalIntent: 'COMING' | null
}

/** 점주 웨이팅 운영 설정 — GET·PUT /settings, POST /open·/close 응답 (WaitingPolicyResponse) */
export interface WaitingSettings {
  storeId: number
  /** 웨이팅 접수 중 여부 */
  open: boolean
  /** 호출 후 도착 제한시간(분) */
  arrivalLimitMinutes: number
}

export const WAITING_STATUS_LABEL: Record<WaitingStatus, string> = {
  WAITING: '대기 중',
  CALLED: '입장 호출',
  CONFIRMED: '방문 예정',
  SEATED: '착석 완료',
  CANCELED: '취소됨',
  NO_SHOW: '순번 만료',
}

/** 입장 호출은 즉시 행동이 필요한 특수 상황이라 primary(노랑) 강조 */
export const WAITING_STATUS_TONE: Record<WaitingStatus, BadgeTone> = {
  WAITING: 'brand',
  CALLED: 'primary',
  CONFIRMED: 'primary',
  SEATED: 'neutral',
  CANCELED: 'neutral',
  NO_SHOW: 'danger',
}
