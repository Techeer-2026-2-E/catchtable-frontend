import type { Waiting, WaitingReceipt, WaitingRegistration, WaitingStatus, WaitingTermination } from '@/entities'
import { apiClient } from '@/shared/lib'

/*
 * 고객 웨이팅 API
 * 내 웨이팅 목록은 별도 API 없이 예약·웨이팅 내역(GET /api/user/reservations?type=WAITING)을 사용
 */

/** WaitingCreateRequest */
export interface RegisterWaitingRequest {
  storeId: number
  /** 1 ~ 20 */
  partyCount: number
}

/** POST /{id}/accept 응답 — WaitingRespondResponse */
export interface WaitingRespondResult {
  waitingId: number
  status: WaitingStatus
  arrivalIntent: 'COMING'
  respondedAt: string
  expiresAt: string | null
}

/**
 * 신청 결과 — 매장 접수 정책에 따라 둘 중 하나
 * - waiting: 바로 번호 발급 (기존 계약, 201 신규 / 200 진행 중인 기존 웨이팅)
 * - receipt: 대기표 (202 접수됨 / 201 번호 발급 완료 / 200 같은 키 재전송, 진행 중인 기존 신청)
 */
export type WaitingSubmitResult =
  | { kind: 'waiting'; waiting: WaitingRegistration }
  | { kind: 'receipt'; receipt: WaitingReceipt; retryAfterSec: number | null }

/** 대기표 조회 결과 — 미완료면 서버가 Retry-After 로 다음 조회 간격(초)을 알려 줌 */
export interface WaitingReceiptView {
  receipt: WaitingReceipt
  retryAfterSec: number | null
}

const readRetryAfter = (headers: Record<string, unknown>) => {
  const sec = Number(headers['retry-after'])
  return Number.isFinite(sec) && sec > 0 ? sec : null
}

export const waitingApi = {
  /**
   * 웨이팅 신청 — Idempotency-Key 는 대기표 방식 매장에서 필수, 기존 방식 매장은 무시
   * 결과를 모르면(네트워크, 503) 같은 본문과 키로 다시 보낸다
   */
  register: async (body: RegisterWaitingRequest, idempotencyKey: string): Promise<WaitingSubmitResult> => {
    const res = await apiClient.post<WaitingRegistration | WaitingReceipt>('/user/waitings', body, {
      headers: { 'Idempotency-Key': idempotencyKey },
    })
    return 'receiptId' in res.data
      ? { kind: 'receipt', receipt: res.data, retryAfterSec: readRetryAfter(res.headers) }
      : { kind: 'waiting', waiting: res.data }
  },
  /** 대기표 조회 — 본인 것만, 남의 표는 404 */
  getReceipt: async (receiptId: string): Promise<WaitingReceiptView> => {
    const res = await apiClient.get<WaitingReceipt>(`/user/waitings/receipts/${receiptId}`)
    return { receipt: res.data, retryAfterSec: readRetryAfter(res.headers) }
  },
  /**
   * 대기표 취소 — 번호 발급 전 철회, 발급 후 실제 취소 200 / 발급 중이라 취소 의사만 저장 202
   * 착석, 노쇼처럼 취소할 수 없는 웨이팅은 409 (cancelOutcome: REJECTED)
   */
  withdrawReceipt: async (receiptId: string): Promise<WaitingReceiptView> => {
    const res = await apiClient.delete<WaitingReceipt>(`/user/waitings/receipts/${receiptId}`)
    return { receipt: res.data, retryAfterSec: readRetryAfter(res.headers) }
  },
  /** 대기순번 조회 */
  getDetail: async (waitingId: number) => {
    const { data } = await apiClient.get<Waiting>(`/user/waitings/${waitingId}`)
    return data
  },
  /** 방문 의사 응답 — CALLED 상태와 기존 제한시간 유지 */
  accept: async (waitingId: number) => {
    const { data } = await apiClient.post<WaitingRespondResult>(`/user/waitings/${waitingId}/accept`)
    return data
  },
  /** 웨이팅 취소 — 종료 결과 반환 */
  cancel: async (waitingId: number) => {
    const { data } = await apiClient.delete<WaitingTermination>(`/user/waitings/${waitingId}`)
    return data
  },
}
