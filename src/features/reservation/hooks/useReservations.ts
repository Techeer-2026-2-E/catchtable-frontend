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
    mutationFn: reservationApi.cancel,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reservationKeys.all }),
  })
}
