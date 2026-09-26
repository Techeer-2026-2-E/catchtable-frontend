import { useMutation, useQueryClient } from '@tanstack/react-query'
import { reservationKeys } from '../api/queryKeys'
import { reservationApi } from '../api/reservationApi'
import { useReservationFormStore } from '../store/reservationFormStore'

export function useReservationForm() {
  const form = useReservationFormStore()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: reservationApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reservationKeys.all })
      form.reset()
    },
  })

  const isValid = !!(form.storeId && form.date && form.time && form.partySize > 0)

  const submit = () => {
    if (!isValid) return
    mutation.mutate({
      storeId: form.storeId!,
      date: form.date!,
      time: form.time!,
      partySize: form.partySize,
    })
  }

  return { form, isValid, submit, ...mutation }
}
