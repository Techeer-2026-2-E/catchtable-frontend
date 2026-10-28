import type { BadgeTone } from '@/shared/ui'

/*
 * 웨이팅 도메인 타입 — 백엔드 feat/waiting-join 브랜치의 waiting DTO 기준
 * (WaitingResponse, WaitingStatus). 경로는 노션 명세(/api/user/waitings)를 따름
 */

/** waiting.entity.WaitingStatus */
export type WaitingStatus =
  | 'WAITING' // 대기 중
  | 'CALLED' // 입장 호출됨
  | 'CONFIRMED' // 도착 의사 응답
  | 'SEATED' // 착석 완료
  | 'CANCELED' // 취소 (고객/점주)
  | 'EXPIRED' // 순번 만료 (미응답·미착석)

/** 진행 중 상태 — 백엔드 WaitingStatus.ACTIVE */
export const ACTIVE_WAITING_STATUSES: WaitingStatus[] = ['WAITING', 'CALLED', 'CONFIRMED']

/** WaitingResponse */
export interface Waiting {
  waitingId: number
  storeId: number
  /** 대기번호 */
  waitNumber: number
  /** 인원수 */
  partyCount: number
  status: WaitingStatus
  /** 내 앞 대기 팀 수 */
  teamsAhead: number
  /* ----- [목 전용] 백엔드 응답에 추가 요청 필요 ----- */
  storeName?: string
  /** 좌석 조건 (상관없음·테이블석·바석) */
  seatPreference?: string | null
  /** 접수 시각 */
  createdAt?: string
  /** 호출 시각 */
  calledAt?: string | null
  /** 호출 응답·착석 제한 시각 */
  callExpiresAt?: string | null
  /** 순번 연기 남은 횟수 */
  deferRemaining?: number
  /** 예상 대기시간(분) — P2(보류) */
  estimatedMinutes?: number | null
}

/** 점주용 대기 고객 — GET /api/owner/stores/{storeId}/waitings (노션 명세) */
export interface OwnerWaiting extends Waiting {
  memberId: number
  customerName: string
  customerPhone: string
  /** 호출 재전송 횟수 (P2) */
  recallCount?: number
}

/** 점주 웨이팅 운영 설정 — PUT /api/owner/stores/{storeId}/waitings/settings */
export interface WaitingSettings {
  /** 웨이팅 접수 중 여부 */
  open: boolean
  /** 호출 후 도착 제한시간(분) */
  arrivalLimitMinutes: number
  /** 공석 시 다음 고객 자동 호출 */
  autoCall: boolean
}

export const WAITING_STATUS_LABEL: Record<WaitingStatus, string> = {
  WAITING: '대기 중',
  CALLED: '입장 호출',
  CONFIRMED: '도착 예정',
  SEATED: '착석 완료',
  CANCELED: '취소됨',
  EXPIRED: '순번 만료',
}

/** 입장 호출은 즉시 행동이 필요한 특수 상황이라 primary(노랑) 강조 */
export const WAITING_STATUS_TONE: Record<WaitingStatus, BadgeTone> = {
  WAITING: 'brand',
  CALLED: 'primary',
  CONFIRMED: 'primary',
  SEATED: 'neutral',
  CANCELED: 'neutral',
  EXPIRED: 'danger',
}
