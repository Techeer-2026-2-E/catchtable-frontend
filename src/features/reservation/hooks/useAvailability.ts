import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { reservationKeys } from '../api/queryKeys'
import { reservationApi } from '../api/reservationApi'

/** 예약 가능 시간·잔여 테이블 — 날짜가 정해져야 조회 */
export function useAvailability(storeId: number, date: string | null, partySize: number) {
  return useQuery({
    queryKey: reservationKeys.availability(storeId, date ?? '', partySize),
    queryFn: () => reservationApi.getAvailability(storeId, { date: date!, partySize }),
    enabled: !!date && Number.isFinite(storeId),
    placeholderData: keepPreviousData,
  })
}
