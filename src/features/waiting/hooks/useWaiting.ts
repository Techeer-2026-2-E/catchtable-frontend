import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ACTIVE_WAITING_STATUSES, type Waiting } from '@/entities'
import { waitingKeys } from '../api/queryKeys'
import { waitingApi } from '../api/waitingApi'

/** 진행 중인 웨이팅은 순번을 주기적으로 다시 받아옴 (SSE 알림이 오면 즉시 갱신) */
const POLLING_MS = 5_000

export function useWaitingDetail(waitingId: number) {
  return useQuery({
    queryKey: waitingKeys.detail(waitingId),
    queryFn: () => waitingApi.getDetail(waitingId),
    enabled: Number.isFinite(waitingId),
    refetchInterval: (query) =>
      query.state.data && ACTIVE_WAITING_STATUSES.includes(query.state.data.status) ? POLLING_MS : false,
  })
}

export function useWaitings() {
  return useQuery({ queryKey: waitingKeys.list(), queryFn: waitingApi.getList })
}

export function useRegisterWaiting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: waitingApi.register,
    onSuccess: (waiting) => {
      queryClient.setQueryData(waitingKeys.detail(waiting.waitingId), waiting)
      queryClient.invalidateQueries({ queryKey: waitingKeys.list() })
    },
  })
}

export function useWaitingActions(waitingId: number) {
  const queryClient = useQueryClient()
  const update = (waiting: Waiting) => {
    queryClient.setQueryData(waitingKeys.detail(waitingId), waiting)
    queryClient.invalidateQueries({ queryKey: waitingKeys.list() })
  }
  const invalidate = () => queryClient.invalidateQueries({ queryKey: waitingKeys.all })

  return {
    accept: useMutation({ mutationFn: () => waitingApi.accept(waitingId), onSuccess: update }),
    defer: useMutation({ mutationFn: () => waitingApi.defer(waitingId), onSuccess: update }),
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
