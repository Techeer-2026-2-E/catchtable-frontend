import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toStoreDateTime } from '@/shared/lib/dayjs'
import { reservationKeys } from '../api/queryKeys'
import { reservationApi } from '../api/reservationApi'
import { useReservationFormStore } from '../store/reservationFormStore'

/** 예약 생성 — 폼 상태(날짜·시간·인원·좌석 타입)로 요청을 만들어 보냄 */
export function useReservationForm() {
  const form = useReservationFormStore()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: reservationApi.create,
    onSuccess: (reservation) => {
      queryClient.setQueryData(reservationKeys.detail(reservation.reservationId), reservation)
      queryClient.invalidateQueries({ queryKey: reservationKeys.all })
    },
  })

  const isValid = !!(form.storeId && form.date && form.time && form.partySize > 0)

  const submit = () => {
    if (!isValid) return Promise.reject(new Error('예약 정보가 부족해요'))
    return mutation.mutateAsync({
      storeId: form.storeId!,
      reservationStartAt: toStoreDateTime(form.date!, form.time!),
      partySize: form.partySize,
      preferredTableType: form.tableType ?? undefined,
      request: form.request || undefined,
    })
  }

  return { form, isValid, submit, ...mutation }
}
