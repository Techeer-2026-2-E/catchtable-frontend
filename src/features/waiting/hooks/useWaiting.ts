import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { waitingKeys } from '../api/queryKeys'
import { waitingApi } from '../api/waitingApi'

/** 대기순번 조회 — 초기값은 REST, 이후 갱신은 useWaitingSSE 가 캐시에 반영 */
export function useWaitingPosition(waitingId: number) {
  return useQuery({
    queryKey: waitingKeys.position(waitingId),
    queryFn: () => waitingApi.getPosition(waitingId),
    enabled: Number.isFinite(waitingId),
  })
}

export function useRegisterWaiting() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: waitingApi.register,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: waitingKeys.all }),
  })
}

export function useWaitingActions(waitingId: number) {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: waitingKeys.position(waitingId) })

  return {
    accept: useMutation({ mutationFn: () => waitingApi.accept(waitingId), onSuccess: invalidate }),
    defer: useMutation({ mutationFn: () => waitingApi.defer(waitingId), onSuccess: invalidate }),
    cancel: useMutation({ mutationFn: () => waitingApi.cancel(waitingId), onSuccess: invalidate }),
  }
}
