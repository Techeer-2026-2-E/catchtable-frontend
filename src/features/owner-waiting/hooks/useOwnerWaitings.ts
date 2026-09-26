import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ownerWaitingApi } from '../api/ownerWaitingApi'
import { ownerWaitingKeys } from '../api/queryKeys'

export function useOwnerWaitings(storeId: number) {
  return useQuery({
    queryKey: ownerWaitingKeys.list(storeId),
    queryFn: () => ownerWaitingApi.getList(storeId),
    enabled: Number.isFinite(storeId),
  })
}

export function useOwnerWaitingActions(storeId: number) {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ownerWaitingKeys.list(storeId) })

  return {
    setOpen: useMutation({ mutationFn: (open: boolean) => ownerWaitingApi.setOpen(storeId, open) }),
    call: useMutation({ mutationFn: ownerWaitingApi.call, onSuccess: invalidate }),
    seat: useMutation({ mutationFn: ownerWaitingApi.seat, onSuccess: invalidate }),
    markNoShow: useMutation({ mutationFn: ownerWaitingApi.markNoShow, onSuccess: invalidate }),
    cancel: useMutation({ mutationFn: ownerWaitingApi.cancel, onSuccess: invalidate }),
  }
}
