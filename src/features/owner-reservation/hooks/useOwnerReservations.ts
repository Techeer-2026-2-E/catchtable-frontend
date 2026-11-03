import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ownerReservationApi,
  type ChangeReservationRequest,
  type OwnerReservationActionRequest,
} from '../api/ownerReservationApi'
import { ownerReservationKeys } from '../api/queryKeys'
import { getErrorCode, refundKeyStorage } from '@/shared/lib'

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
      // 무료 예약은 키 없이 취소된다. 환불이 남아 409 면 같은 키로 환불과 취소를 함께 요청
      mutationFn: async ({ id, body }: { id: number; body: OwnerReservationActionRequest }) => {
        const pendingKey = refundKeyStorage.peek('owner-cancel', id)
        if (pendingKey) return ownerReservationApi.cancel(id, body, pendingKey)
        try {
          return await ownerReservationApi.cancel(id, body)
        } catch (e) {
          if (getErrorCode(e) !== 'REFUND_NOT_COMPLETED') throw e
          return ownerReservationApi.cancel(id, body, refundKeyStorage.get('owner-cancel', id))
        }
      },
      onSuccess: (_data, { id }) => {
        refundKeyStorage.clear('owner-cancel', id)
        return invalidate()
      },
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
