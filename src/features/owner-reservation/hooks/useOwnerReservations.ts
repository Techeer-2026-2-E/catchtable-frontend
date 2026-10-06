import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ownerReservationApi,
  type ChangeReservationRequest,
  type OwnerReservationActionRequest,
} from '../api/ownerReservationApi'
import { ownerReservationKeys } from '../api/queryKeys'

/** 날짜별 예약 현황 — 1분마다 갱신 (자동 이용 완료 반영) */
export function useOwnerReservations(storeId: number, date: string) {
  return useQuery({
    queryKey: ownerReservationKeys.list(storeId, date),
    queryFn: () => ownerReservationApi.getList(storeId, { date }),
    refetchInterval: 60_000,
  })
}

export function useOwnerReservationActions() {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ownerReservationKeys.all })

  return {
    enter: useMutation({ mutationFn: (id: number) => ownerReservationApi.enter(id), onSuccess: invalidate }),
    cancel: useMutation({
      mutationFn: ({ id, body }: { id: number; body: OwnerReservationActionRequest }) =>
        ownerReservationApi.cancel(id, body),
      onSuccess: invalidate,
    }),
    noShow: useMutation({
      mutationFn: ({ id, body }: { id: number; body: OwnerReservationActionRequest }) =>
        ownerReservationApi.markNoShow(id, body),
      onSuccess: invalidate,
    }),
    /** P2 */
    change: useMutation({
      mutationFn: ({ id, body }: { id: number; body: ChangeReservationRequest }) =>
        ownerReservationApi.change(id, body),
      onSuccess: invalidate,
    }),
  }
}
