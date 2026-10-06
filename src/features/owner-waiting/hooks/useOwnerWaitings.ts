import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { WaitingSettings } from '@/entities'
import { ownerWaitingApi } from '../api/ownerWaitingApi'
import { ownerWaitingKeys } from '../api/queryKeys'

/** 대기 고객 목록 — 새 웨이팅 접수를 반영하도록 10초마다 갱신 */
export function useOwnerWaitings(storeId: number) {
  return useQuery({
    queryKey: ownerWaitingKeys.list(storeId),
    queryFn: () => ownerWaitingApi.getList(storeId),
    refetchInterval: 10_000,
  })
}

export function useWaitingSettings(storeId: number) {
  return useQuery({
    queryKey: ownerWaitingKeys.settings(storeId),
    queryFn: () => ownerWaitingApi.getSettings(storeId),
  })
}

export function useWaitingSettingsMutations(storeId: number) {
  const queryClient = useQueryClient()
  const set = (data: WaitingSettings) => queryClient.setQueryData(ownerWaitingKeys.settings(storeId), data)
  return {
    open: useMutation({ mutationFn: () => ownerWaitingApi.open(storeId), onSuccess: set }),
    close: useMutation({ mutationFn: () => ownerWaitingApi.close(storeId), onSuccess: set }),
    update: useMutation({
      mutationFn: (body: Partial<WaitingSettings>) => ownerWaitingApi.updateSettings(storeId, body),
      onSuccess: set,
    }),
  }
}

export function useOwnerWaitingActions(storeId: number) {
  const queryClient = useQueryClient()
  const onSuccess = () => queryClient.invalidateQueries({ queryKey: ownerWaitingKeys.list(storeId) })

  return {
    call: useMutation({ mutationFn: ownerWaitingApi.call, onSuccess }),
    /** P2 */
    recall: useMutation({ mutationFn: ownerWaitingApi.recall, onSuccess }),
    enter: useMutation({ mutationFn: ownerWaitingApi.enter, onSuccess }),
    noShow: useMutation({ mutationFn: ownerWaitingApi.markNoShow, onSuccess }),
    defer: useMutation({ mutationFn: ownerWaitingApi.defer, onSuccess }),
    cancel: useMutation({ mutationFn: ownerWaitingApi.cancel, onSuccess }),
  }
}
