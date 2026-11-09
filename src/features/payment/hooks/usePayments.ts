import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { paymentApi } from '../api/paymentApi'
import { paymentKeys } from '../api/queryKeys'

const PAGE_SIZE = 10

export function useUnconfirmedRefundRequest(paymentId: number, enabled: boolean) {
  return useQuery({
    queryKey: paymentKeys.unconfirmedRefund(paymentId),
    queryFn: () => paymentApi.getUnconfirmedRefund(paymentId),
    enabled: enabled && Number.isFinite(paymentId),
    retry: false,
    refetchInterval: (query) => ['REQUESTED', 'UNKNOWN'].includes(query.state.data?.refundStatus ?? '') ? 3000 : false,
  })
}

export function useRequestUnconfirmedRefund() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ paymentId, key }: { paymentId: number; key: string }) => paymentApi.requestUnconfirmedRefund(paymentId, key),
    onSuccess: (request) => client.setQueryData(paymentKeys.unconfirmedRefund(request.paymentId), request),
    // 접수 응답을 잃어도 서버에 저장된 요청 상태를 다시 읽는다.
    onSettled: (_data, _error, { paymentId }) => {
      client.invalidateQueries({ queryKey: paymentKeys.unconfirmedRefund(paymentId) })
      client.invalidateQueries({ queryKey: paymentKeys.detail(paymentId) })
    },
  })
}

/** 주문 준비 — 재요청해도 같은 주문이라 조회처럼 다룸. 만료 뒤 새 주문을 시도하지 않도록 재시도·자동 갱신 없음 */
export function usePreparedPayment(holdId: number, enabled: boolean) {
  return useQuery({
    queryKey: paymentKeys.prepared(holdId),
    queryFn: () => paymentApi.prepare(holdId),
    enabled,
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })
}

export function useConfirmPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: paymentApi.confirm,
    // 예약 상태도 함께 바뀌므로 호출하는 화면에서 예약 쪽도 갱신한다
    onSettled: () => queryClient.invalidateQueries({ queryKey: paymentKeys.all }),
  })
}

export function usePaymentList() {
  return useInfiniteQuery({
    queryKey: paymentKeys.list(),
    queryFn: ({ pageParam }) => paymentApi.getList({ page: pageParam, size: PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.hasNext ? last.page + 1 : undefined),
  })
}

export function usePaymentDetail(paymentId: number) {
  return useQuery({
    queryKey: paymentKeys.detail(paymentId),
    queryFn: () => paymentApi.getDetail(paymentId),
    enabled: Number.isFinite(paymentId),
  })
}

export function useSyncPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: paymentApi.sync,
    onSuccess: (detail) => {
      queryClient.setQueryData(paymentKeys.detail(detail.paymentId), detail)
      queryClient.invalidateQueries({ queryKey: paymentKeys.list() })
    },
  })
}

/** 선점에 이미 진행 중인 결제를 찾음 — prepare 가 PAYMENT_STATUS_CHECK_REQUIRED 일 때 사용 */
export async function findPaymentByHold(holdId: number) {
  for (let page = 0; ; page++) {
    const result = await paymentApi.getList({ page, size: 50 })
    const payment = result.payments.find((item) => item.holdId === holdId)
    if (payment) return payment
    if (!result.hasNext) return null
  }
}

/** 예약금 일부 환불 — 결제·예약 관련 캐시를 모두 새로 받음 */
export function useRefundPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ paymentId, key, cancelReason, cancelAmount }: { paymentId: number; key: string; cancelReason: string; cancelAmount: number }) =>
      paymentApi.refund(paymentId, key, { cancelReason, cancelAmount }),
    // 예약 캐시(['reservations', …])에는 환불 예상도 포함된다
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: paymentKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['reservations'] }),
      ]),
  })
}
