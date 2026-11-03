import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { dayjs } from '@/shared/lib/dayjs'
import { reservationKeys } from '../api/queryKeys'
import { reservationApi } from '../api/reservationApi'

export function useCreateHold() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: reservationApi.createHold,
    onSuccess: (hold) => {
      queryClient.setQueryData(reservationKeys.hold(hold.holdId), hold)
      queryClient.invalidateQueries({ queryKey: reservationKeys.all })
    },
  })
}

export function useHold(holdId: number) {
  return useQuery({
    queryKey: reservationKeys.hold(holdId),
    queryFn: () => reservationApi.getHold(holdId),
    enabled: Number.isFinite(holdId),
    refetchOnWindowFocus: true,
  })
}

export function useReleaseHold() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: reservationApi.releaseHold,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reservationKeys.all }),
  })
}

/** 서버 시각 기준 남은 초 — 기기 시계가 틀려도 서버 만료시각에 맞춰 줄어듦 */
export function useHoldCountdown(hold: { expiresAt: string; serverTime: string } | undefined, fetchedAt: number) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1_000)
    return () => clearInterval(timer)
  }, [])

  if (!hold) return 0
  // 응답을 받은 시점의 서버·기기 시각 차이
  const clockOffset = dayjs(hold.serverTime).valueOf() - fetchedAt
  return Math.max(0, Math.floor((dayjs(hold.expiresAt).valueOf() - (now + clockOffset)) / 1_000))
}
