import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type PointerEvent } from 'react'
import { Minus, Plus } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import styles from './MapView.module.css'
import type { GeoPoint, MapViewProps } from './types'

/* 웹 메르카토르 — zoom 단계에서 지구 전체가 256·2^zoom 픽셀 */
const TILE = 256
const MIN_ZOOM = 12
const MAX_ZOOM = 18
/** 카카오 4단계와 비슷한 폭 */
const DEFAULT_ZOOM = 15

const worldSize = (zoom: number) => TILE * 2 ** zoom
function project({ lat, lng }: GeoPoint, zoom: number) {
  const s = Math.sin((lat * Math.PI) / 180)
  const size = worldSize(zoom)
  return { x: ((lng + 180) / 360) * size, y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * size }
}
function unproject(x: number, y: number, zoom: number): GeoPoint {
  const size = worldSize(zoom)
  const lng = (x / size) * 360 - 180
  const n = Math.PI - (2 * Math.PI * y) / size
  return { lat: (180 / Math.PI) * Math.atan(Math.sinh(n)), lng }
}

/**
 * 키 없이 그리는 간이 지도 — 카카오맵 키가 없거나 SDK 를 못 불러왔을 때
 * 바탕 그림 없이 격자 위에 핀만 그린다. 끌어서 이동, 휠이나 +/- 로 확대
 */
export function SchematicMapView({ initialCenter, initialOffsetY = 0, pins, myLocation, onIdle, onPinClick, onMapClick, ref, className }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [zoom, setZoom] = useState(DEFAULT_ZOOM)
  const [center, setCenter] = useState(() => {
    const p = project(initialCenter, DEFAULT_ZOOM)
    return { x: p.x, y: p.y + initialOffsetY }
  })
  const drag = useRef<{ x: number; y: number; moved: boolean; id: number } | null>(null)
  const handlers = useRef({ onIdle, onMapClick })
  useLayoutEffect(() => {
    handlers.current = { onIdle, onMapClick }
  })

  useImperativeHandle(
    ref,
    () => ({
      panTo: (point, options) => {
        const p = project(point, zoom)
        setCenter({ x: p.x, y: p.y + (options?.offsetY ?? 0) })
      },
    }),
    [zoom],
  )

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // 멈추면 범위를 알린다 — 끄는 중에는 drag 가 있어서 건너뛰고, 놓을 때 다시 돈다
  const [settled, setSettled] = useState(0)
  useEffect(() => {
    if (!size.width || drag.current) return
    const t = window.setTimeout(() => {
      const sw = unproject(center.x - size.width / 2, center.y + size.height / 2, zoom)
      const ne = unproject(center.x + size.width / 2, center.y - size.height / 2, zoom)
      handlers.current.onIdle({ swLat: sw.lat, swLng: sw.lng, neLat: ne.lat, neLng: ne.lng }, unproject(center.x, center.y, zoom))
    }, 200)
    return () => window.clearTimeout(t)
  }, [center, zoom, size, settled])

  const zoomTo = useCallback(
    (next: number) => {
      const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next))
      if (z === zoom) return
      const k = 2 ** (z - zoom)
      setCenter((c) => ({ x: c.x * k, y: c.y * k }))
      setZoom(z)
    },
    [zoom],
  )

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return
    drag.current = { x: e.clientX, y: e.clientY, moved: false, id: e.pointerId }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (!d.moved && Math.hypot(dx, dy) < 4) return
    d.moved = true
    d.x = e.clientX
    d.y = e.clientY
    setCenter((c) => ({ x: c.x - dx, y: c.y - dy }))
  }
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    drag.current = null
    if (d.moved) setSettled((n) => n + 1)
    else handlers.current.onMapClick?.()
  }

  const toScreen = (p: GeoPoint) => {
    const { x, y } = project(p, zoom)
    return { left: x - center.x + size.width / 2, top: y - center.y + size.height / 2 }
  }
  const visible = (pos: { left: number; top: number }) =>
    pos.left > -40 && pos.left < size.width + 40 && pos.top > -40 && pos.top < size.height + 40

  // 격자는 지도와 함께 움직이게 배경 위치를 옮긴다
  const grid = 64
  const gridOffset = `${-center.x % grid + size.width / 2}px ${-center.y % grid + size.height / 2}px`
  const me = myLocation ? toScreen(myLocation) : null

  return (
    <div
      ref={containerRef}
      className={cn(styles.map, styles.schematic, className)}
      style={{ backgroundPosition: gridOffset }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (drag.current = null)}
      onWheel={(e) => zoomTo(zoom + (e.deltaY < 0 ? 1 : -1))}
    >
      {pins.map((pin) => {
        const pos = toScreen(pin)
        if (!visible(pos)) return null
        return (
          <button
            key={pin.id}
            type="button"
            className={cn(styles.pin, styles.placed, pin.selected && styles.pinSelected)}
            style={{ left: pos.left, top: pos.top, zIndex: pin.selected ? 10 : 1 }}
            aria-label={pin.label}
            aria-pressed={!!pin.selected}
            onClick={(e) => {
              e.stopPropagation()
              onPinClick(pin.id)
            }}
          >
            {pin.selected && <span className={styles.pinLabel}>{pin.label}</span>}
          </button>
        )
      })}
      {me && visible(me) && <span className={cn(styles.me, styles.placed)} style={{ left: me.left, top: me.top }} aria-label="내 위치" />}

      <div className={styles.zoom}>
        <button type="button" aria-label="확대" disabled={zoom >= MAX_ZOOM} onClick={() => zoomTo(zoom + 1)}>
          <Plus aria-hidden />
        </button>
        <button type="button" aria-label="축소" disabled={zoom <= MIN_ZOOM} onClick={() => zoomTo(zoom - 1)}>
          <Minus aria-hidden />
        </button>
      </div>
      <p className={styles.notice}>카카오맵 키가 없어 간이 지도로 보여요</p>
    </div>
  )
}
