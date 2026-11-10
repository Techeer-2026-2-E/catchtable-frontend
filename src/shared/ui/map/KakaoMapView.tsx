import { useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/shared/lib/cn'
import { type KakaoCustomOverlay, type KakaoMap, type KakaoMaps } from './kakaoLoader'
import styles from './MapView.module.css'
import { createMyLocationElement, createPinElement } from './pinElement'
import type { MapViewProps } from './types'

/** 기본 확대 단계 — 3 은 골목, 4 는 동네(약 1~2km 폭) */
const DEFAULT_LEVEL = 4

/** 카카오맵 — 이미 불러온 SDK(maps)를 받아 그린다 */
export function KakaoMapView({
  maps,
  initialCenter,
  pins,
  myLocation,
  onIdle,
  onPinClick,
  onMapClick,
  ref,
  className,
}: MapViewProps & { maps: KakaoMaps }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<KakaoMap | null>(null)
  // 가운데는 처음 값만 쓴다 (이후 이동은 panTo)
  const [start] = useState(initialCenter)
  // 콜백은 매번 새로 만들어지므로 최신 값을 ref 로 들고 리스너는 한 번만 단다
  const handlers = useRef({ onIdle, onPinClick, onMapClick })
  useLayoutEffect(() => {
    handlers.current = { onIdle, onPinClick, onMapClick }
  })

  useImperativeHandle(ref, () => ({
    panTo: ({ lat, lng }) => mapRef.current?.panTo(new maps.LatLng(lat, lng)),
  }), [maps])

  // 지도 만들기 — 처음 한 번
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const map = new maps.Map(el, { center: new maps.LatLng(start.lat, start.lng), level: DEFAULT_LEVEL })
    mapRef.current = map
    const report = () => {
      const b = map.getBounds()
      const sw = b.getSouthWest()
      const ne = b.getNorthEast()
      const c = map.getCenter()
      handlers.current.onIdle(
        { swLat: sw.getLat(), swLng: sw.getLng(), neLat: ne.getLat(), neLng: ne.getLng() },
        { lat: c.getLat(), lng: c.getLng() },
      )
    }
    const click = () => handlers.current.onMapClick?.()
    maps.event.addListener(map, 'idle', report)
    maps.event.addListener(map, 'click', click)
    const observer = new ResizeObserver(() => map.relayout())
    observer.observe(el)
    return () => {
      maps.event.removeListener(map, 'idle', report)
      maps.event.removeListener(map, 'click', click)
      observer.disconnect()
      mapRef.current = null
    }
  }, [maps, start])

  // 핀 — 바뀔 때마다 다시 올린다 (최대 1000개라 단순하게)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const overlays: KakaoCustomOverlay[] = pins.map(
      (pin) =>
        new maps.CustomOverlay({
          position: new maps.LatLng(pin.lat, pin.lng),
          content: createPinElement(pin.label, !!pin.selected, () => handlers.current.onPinClick(pin.id)),
          yAnchor: pin.selected ? 1 : 0.5,
          zIndex: pin.selected ? 10 : 1,
          clickable: true,
        }),
    )
    overlays.forEach((o) => o.setMap(map))
    return () => overlays.forEach((o) => o.setMap(null))
  }, [maps, pins])

  // 내 위치
  useEffect(() => {
    const map = mapRef.current
    if (!map || !myLocation) return
    const overlay = new maps.CustomOverlay({
      position: new maps.LatLng(myLocation.lat, myLocation.lng),
      content: createMyLocationElement(),
      zIndex: 5,
    })
    overlay.setMap(map)
    return () => overlay.setMap(null)
  }, [maps, myLocation])

  return <div ref={containerRef} className={cn(styles.map, className)} />
}
