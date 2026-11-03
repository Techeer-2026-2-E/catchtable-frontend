import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { reservationKeys } from '../api/queryKeys'
import { reservationApi, type HistoryParams } from '../api/reservationApi'

/** 예약·웨이팅 내역 — 진행 중인 웨이팅 순번이 바뀌므로 화면에 있는 동안 30초마다 갱신 */
export function useHistory(params?: HistoryParams) {
  return useQuery({
    queryKey: reservationKeys.history(params),
    queryFn: () => reservationApi.getHistory(params),
    refetchInterval: 30_000,
  })
}

export function useReservationDetail(reservationId: number) {
  return useQuery({
    queryKey: reservationKeys.detail(reservationId),
    queryFn: () => reservationApi.getDetail(reservationId),
    enabled: Number.isFinite(reservationId),
  })
}

/** 환불 예상액 — 취소 확인창을 열 때만 조회. 시점마다 금액이 달라지므로 캐시하지 않음 */
export function useRefundPreview(reservationId: number, enabled: boolean) {
  return useQuery({
    queryKey: reservationKeys.refundPreview(reservationId),
    queryFn: () => reservationApi.getRefundPreview(reservationId),
    enabled,
    gcTime: 0,
    staleTime: 0,
    retry: false,
  })
}

export function useCancelReservation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ reservationId, idempotencyKey }: { reservationId: number; idempotencyKey?: string }) =>
      reservationApi.cancel(reservationId, idempotencyKey),
    onSuccess: (data) => {
      queryClient.setQueryData(reservationKeys.detail(data.reservationId), data)
      queryClient.invalidateQueries({ queryKey: reservationKeys.all })
    },
  })
}
