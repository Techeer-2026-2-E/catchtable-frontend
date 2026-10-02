import { useQuery } from '@tanstack/react-query'
import { reservationKeys } from '../api/queryKeys'
import { reservationApi } from '../api/reservationApi'

export function useAvailability(storeId: number, date: string | null, partySize: number) {
  return useQuery({
    queryKey: reservationKeys.availability(storeId, date ?? '', partySize),
    queryFn: () => reservationApi.getAvailability(storeId, { date: date!, partySize }),
    enabled: !!date,
  })
}
