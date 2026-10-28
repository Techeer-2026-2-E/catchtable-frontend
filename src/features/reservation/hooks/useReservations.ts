import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { reservationKeys } from '../api/queryKeys'
import { isFeatureAvailable } from '@/shared/config'
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

export function useCancelReservation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (reservationId: number) => reservationApi.cancel(reservationId),
    onSuccess: (data) => {
      queryClient.setQueryData(reservationKeys.detail(data.reservationId), data)
      queryClient.invalidateQueries({ queryKey: reservationKeys.all })
    },
  })
}

/** P2: 환불 예상액 (예약금 결제한 예약 취소 전 안내) */
export function useRefundPreview(reservationId: number, enabled: boolean) {
  return useQuery({
    queryKey: reservationKeys.refundPreview(reservationId),
    queryFn: () => reservationApi.getRefundPreview(reservationId),
    enabled: enabled && isFeatureAvailable('refundPreview'),
  })
}
