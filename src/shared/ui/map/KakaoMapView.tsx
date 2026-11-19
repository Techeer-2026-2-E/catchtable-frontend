import { useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/shared/lib/cn'
import { type KakaoCustomOverlay, type KakaoMap, type KakaoMaps } from './kakaoLoader'
import styles from './MapView.module.css'
import { createMyLocationElement, createPinElement } from './pinElement'
import type { MapViewProps } from './types'

/** 지점이 가운데보다 offsetY(px) 위에 보이게 하는 새 가운데 */
function shifted(maps: KakaoMaps, map: KakaoMap, lat: number, lng: number, offsetY: number) {
  const target = new maps.LatLng(lat, lng)
  if (!offsetY) return target
  const projection = map.getProjection()
  const p = projection.containerPointFromCoords(target)
  return projection.coordsFromContainerPoint(new maps.Point(p.x, p.y + offsetY))
}

/** 기본 확대 단계 — 3 은 골목, 4 는 동네(약 1~2km 폭) */
const DEFAULT_LEVEL = 4

/** 카카오맵 — 이미 불러온 SDK(maps)를 받아 그린다 */
export function KakaoMapView({
  maps,
  initialCenter,
  initialOffsetY = 0,
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
  const [start] = useState(() => ({ ...initialCenter, offsetY: initialOffsetY }))
  // 콜백은 매번 새로 만들어지므로 최신 값을 ref 로 들고 리스너는 한 번만 단다
  const handlers = useRef({ onIdle, onPinClick, onMapClick })
  useLayoutEffect(() => {
    handlers.current = { onIdle, onPinClick, onMapClick }
  })

  useImperativeHandle(ref, () => ({
    panTo: ({ lat, lng }, options) => {
      const map = mapRef.current
      if (map) map.panTo(shifted(maps, map, lat, lng, options?.offsetY ?? 0))
    },
  }), [maps])

  // 지도 만들기 — 처음 한 번
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const map = new maps.Map(el, { center: new maps.LatLng(start.lat, start.lng), level: DEFAULT_LEVEL })
    mapRef.current = map
    if (start.offsetY) map.setCenter(shifted(maps, map, start.lat, start.lng, start.offsetY))
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

  // 핀 — 바뀐 것만 다시 올린다. 핀 하나를 고르면 전체(최대 1000개)가 아니라 이전·새 선택 핀 2개만 갱신
  const rendered = useRef(new Map<number, { signature: string; overlay: KakaoCustomOverlay }>())
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const current = rendered.current
    const seen = new Set<number>()
    for (const pin of pins) {
      seen.add(pin.id)
      const signature = `${pin.lat},${pin.lng},${pin.selected ? 1 : 0},${pin.label}`
      const prev = current.get(pin.id)
      if (prev?.signature === signature) continue
      prev?.overlay.setMap(null)
      const overlay = new maps.CustomOverlay({
        position: new maps.LatLng(pin.lat, pin.lng),
        content: createPinElement(pin.label, !!pin.selected, () => handlers.current.onPinClick(pin.id)),
        yAnchor: pin.selected ? 1 : 0.5,
        zIndex: pin.selected ? 10 : 1,
        clickable: true,
      })
      overlay.setMap(map)
      current.set(pin.id, { signature, overlay })
    }
    for (const [id, { overlay }] of current) {
      if (seen.has(id)) continue
      overlay.setMap(null)
      current.delete(id)
    }
  }, [maps, pins])
  // 지도를 치울 때 남은 핀 정리
  useEffect(() => {
    const current = rendered.current
    return () => {
      current.forEach(({ overlay }) => overlay.setMap(null))
      current.clear()
    }
  }, [maps])

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
