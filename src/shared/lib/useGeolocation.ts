import { useCallback, useEffect, useState } from 'react'

export interface GeoPosition {
  lat: number
  lng: number
}

export type GeolocationStatus = 'idle' | 'pending' | 'granted' | 'denied' | 'unsupported'

const OPTIONS: PositionOptions = { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 }

/**
 * 브라우저 현재 위치 — 권한을 거절하거나 지원하지 않으면 position 은 null
 * auto 면 처음 그릴 때 한 번 묻는다
 */
export function useGeolocation({ auto = true }: { auto?: boolean } = {}) {
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
