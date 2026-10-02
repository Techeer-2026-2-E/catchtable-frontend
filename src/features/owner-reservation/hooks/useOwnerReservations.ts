import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ownerReservationApi } from '../api/ownerReservationApi'
import { ownerReservationKeys } from '../api/queryKeys'

export function useOwnerReservations(storeId: number, date?: string) {
  return useQuery({
    queryKey: ownerReservationKeys.list(storeId, date),
    queryFn: () => ownerReservationApi.getList(storeId, { date }),
    enabled: Number.isFinite(storeId),
  })
}

export function useOwnerReservationActions() {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ownerReservationKeys.all })

  return {
    cancel: useMutation({ mutationFn: ownerReservationApi.cancel, onSuccess: invalidate }),
    markVisited: useMutation({ mutationFn: ownerReservationApi.markVisited, onSuccess: invalidate }),
    markNoShow: useMutation({ mutationFn: ownerReservationApi.markNoShow, onSuccess: invalidate }),
  }
}
