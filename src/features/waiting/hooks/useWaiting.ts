import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { ACTIVE_WAITING_STATUSES, UNFINISHED_RECEIPT_STATUSES } from '@/entities'
import { getErrorCode } from '@/shared/lib'
import { waitingKeys } from '../api/queryKeys'
import { waitingApi, type RegisterWaitingRequest } from '../api/waitingApi'

/** 진행 중인 웨이팅은 순번을 주기적으로 다시 받아옴 (SSE 알림이 오면 즉시 갱신) */
const POLLING_MS = 5_000

export function useWaitingDetail(waitingId: number) {
  return useQuery({
    queryKey: waitingKeys.detail(waitingId),
    queryFn: () => waitingApi.getDetail(waitingId),
    enabled: Number.isFinite(waitingId),
    refetchInterval: (query) => (query.state.data && ACTIVE_WAITING_STATUSES.includes(query.state.data.status) ? POLLING_MS : false),
  })
}

/** 결과를 모르는 실패 — 응답이 없거나 저장 결과 확인 불가(503). 같은 키로 다시 보내면 안전하다 */
const isUnconfirmed = (error: unknown) =>
  isAxiosError(error) && (!error.response || getErrorCode(error) === 'WAITING_RECEIPT_UNCONFIRMED' || error.response.status === 503)

/** 실패 응답의 Retry-After(초) — 없으면 null */
export const retryAfterOf = (error: unknown) => {
  const sec = isAxiosError(error) ? Number(error.response?.headers['retry-after']) : NaN
  return Number.isFinite(sec) && sec > 0 ? sec : null
}

/** 결과를 모를 때 같은 키로 자동 재전송하는 횟수 */
const UNCONFIRMED_RETRIES = 2

/**
 * 웨이팅 신청 — 키는 화면이 회원, 매장, 인원별로 보관한 값 (waitingIntakeKeyStorage)
 * 결과를 모르면 서버가 알려 준 간격(Retry-After) 뒤 같은 키로 두 번까지 다시 보낸다
 */
export function useRegisterWaiting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ body, key }: { body: RegisterWaitingRequest; key: string }) => waitingApi.register(body, key),
    retry: (failureCount, error) => failureCount < UNCONFIRMED_RETRIES && isUnconfirmed(error),
    retryDelay: (_count, error) => (retryAfterOf(error) ?? 2) * 1000,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: waitingKeys.all }),
  })
}

/** 대기표 — 결과가 나올 때까지 서버가 알려 준 간격(Retry-After)에 조금 무작위 지연을 더해 다시 조회 */
export function useWaitingReceipt(receiptId: string | undefined) {
  return useQuery({
    queryKey: waitingKeys.receipt(receiptId ?? ''),
    queryFn: () => waitingApi.getReceipt(receiptId!),
    enabled: !!receiptId,
    refetchInterval: (query) => {
      const view = query.state.data
      if (!view || !UNFINISHED_RECEIPT_STATUSES.includes(view.receipt.status)) return false
      // 동시에 몰리지 않게 0~0.5초 더함
      return (view.retryAfterSec ?? 2) * 1000 + Math.round(Math.random() * 500)
    },
  })
}

/** 대기표 취소 — 결과를 바로 캐시에 반영하고, 취소 확인 중(202)이면 위 조회가 이어서 확인 */
export function useWithdrawWaitingReceipt(receiptId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => waitingApi.withdrawReceipt(receiptId),
    onSuccess: (view) => {
      queryClient.setQueryData(waitingKeys.receipt(receiptId), view)
      queryClient.invalidateQueries({ queryKey: waitingKeys.all, refetchType: 'none' })
    },
    onError: (error) => {
      // 409 REJECTED 도 같은 대기표 형식으로 오므로 화면에 반영
      const data = isAxiosError(error) ? error.response?.data : undefined
      if (data && typeof data === 'object' && 'receiptId' in data) {
        queryClient.setQueryData(waitingKeys.receipt(receiptId), { receipt: data, retryAfterSec: null })
      }
    },
  })
}

/** 응답이 상세 형식과 달라서 성공하면 상세를 다시 조회 */
export function useWaitingActions(waitingId: number) {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: waitingKeys.all })

  return {
    accept: useMutation({ mutationFn: () => waitingApi.accept(waitingId), onSuccess: invalidate }),
    cancel: useMutation({ mutationFn: () => waitingApi.cancel(waitingId), onSuccess: invalidate }),
  }
}

/** 마이다이닝에서 여러 웨이팅 중 하나 취소 */
export function useCancelWaiting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (waitingId: number) => waitingApi.cancel(waitingId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: waitingKeys.all }),
  })
}
