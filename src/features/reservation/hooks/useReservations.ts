import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { reservationKeys } from '../api/queryKeys'
import { reservationApi } from '../api/reservationApi'

export function useReservations() {
  return useQuery({ queryKey: reservationKeys.list(), queryFn: reservationApi.getList })
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
    enabled,
  })
}
