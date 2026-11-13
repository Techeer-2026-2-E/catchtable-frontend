import { useCallback, useEffect, useState } from 'react'
import { env } from '@/shared/config'

export interface GeoPosition {
  lat: number
  lng: number
}

export type GeolocationStatus = 'idle' | 'pending' | 'granted' | 'denied' | 'unsupported'

const OPTIONS: PositionOptions = { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 }

/**
 * 브라우저 현재 위치 — 권한을 거절하거나 지원하지 않으면 position 은 null
 * auto 면 처음 그릴 때 한 번 묻는다
 * 목 위치(env.mockLocation)가 있으면 권한을 묻지 않고 늘 그 위치를 준다
 */
export function useGeolocation(options: { auto?: boolean } = {}) {
  const mock = env.mockLocation
  const real = useRealGeolocation({ auto: !mock && (options.auto ?? true) })
  const mockRequest = useCallback(() => Promise.resolve(mock), [mock])
  if (mock) return { position: mock, status: 'granted' as GeolocationStatus, request: mockRequest, mocked: true }
  return { ...real, mocked: false }
}

function useRealGeolocation({ auto }: { auto: boolean }) {
  const supported = typeof navigator !== 'undefined' && 'geolocation' in navigator
  const [position, setPosition] = useState<GeoPosition | null>(null)
  const [status, setStatus] = useState<GeolocationStatus>(supported ? 'idle' : 'unsupported')

  const request = useCallback(
    () =>
      new Promise<GeoPosition | null>((resolve) => {
        if (!supported) return resolve(null)
        setStatus('pending')
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => {
            const next = { lat: coords.latitude, lng: coords.longitude }
            setPosition(next)
            setStatus('granted')
            resolve(next)
          },
          () => {
            setStatus('denied')
            resolve(null)
          },
          OPTIONS,
        )
      }),
    [supported],
  )

  useEffect(() => {
    if (auto) void request()
  }, [auto, request])

  return { position, status, request }
}
