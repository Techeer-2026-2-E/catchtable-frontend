import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { WaitingSettings } from '@/entities'
import { ownerWaitingApi, type UpdateWaitingSettingsRequest } from '../api/ownerWaitingApi'
import { ownerWaitingKeys } from '../api/queryKeys'

/** 대기 고객 목록 — 실시간 구독이 끊겨도 반영되도록 30초마다 갱신 */
export function useOwnerWaitings(storeId: number) {
  return useQuery({
    queryKey: ownerWaitingKeys.list(storeId),
    queryFn: () => ownerWaitingApi.getList(storeId),
    refetchInterval: 30_000,
  })
}

/**
 * 점주 실시간 구독 — 연결·재연결("connect")과 WAITING_CHANGED 때 목록을 다시 조회
 * 이벤트 재생은 없으므로 받을 때마다 서버 목록을 다시 받음
 */
export function useOwnerWaitingStream(storeId: number, memberId: number | null) {
  const queryClient = useQueryClient()
  useEffect(() => {
    if (memberId == null || !Number.isFinite(storeId) || typeof EventSource === 'undefined') return
    const source = new EventSource(ownerWaitingApi.subscribeUrl(storeId, memberId))
    const refresh = () => queryClient.invalidateQueries({ queryKey: ownerWaitingKeys.list(storeId) })
    source.addEventListener('connect', refresh)
    source.addEventListener('WAITING_CHANGED', refresh)
    return () => source.close()
  }, [storeId, memberId, queryClient])
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
      mutationFn: (body: UpdateWaitingSettingsRequest) => ownerWaitingApi.updateSettings(storeId, body),
      onSuccess: set,
    }),
  }
}

export function useOwnerWaitingActions(storeId: number) {
  const queryClient = useQueryClient()
  const onSuccess = () => queryClient.invalidateQueries({ queryKey: ownerWaitingKeys.list(storeId) })

  return {
    call: useMutation({ mutationFn: ownerWaitingApi.call, onSuccess }),
    enter: useMutation({ mutationFn: ownerWaitingApi.enter, onSuccess }),
    noShow: useMutation({ mutationFn: ownerWaitingApi.markNoShow, onSuccess }),
    cancel: useMutation({ mutationFn: ownerWaitingApi.cancel, onSuccess }),
  }
}
