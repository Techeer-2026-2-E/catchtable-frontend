import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { paymentApi } from '../api/paymentApi'
import { paymentKeys } from '../api/queryKeys'

const PAGE_SIZE = 10

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
  const { payments } = await paymentApi.getList({ size: 50 })
  return payments.find((payment) => payment.holdId === holdId) ?? null
}
