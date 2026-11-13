import type { LatLng, MapBounds } from '@/entities'

/** 위치 권한이 없을 때 쓰는 기본 위치 — 강남역 */
export const DEFAULT_CENTER: LatLng = { lat: 37.4979, lng: 127.0276 }
/** 백엔드 store.map.max-side-km */
export const MAX_SIDE_KM = 5

const R = 6371
const rad = (d: number) => (d * Math.PI) / 180

/** 두 지점 사이 거리 (km, 하버사인) */
export function distanceKm(a: LatLng, b: LatLng) {
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** 화면 사각형의 가로, 세로 길이 (km) */
export function boundsSideKm(b: MapBounds) {
  const width = distanceKm({ lat: (b.swLat + b.neLat) / 2, lng: b.swLng }, { lat: (b.swLat + b.neLat) / 2, lng: b.neLng })
  const height = distanceKm({ lat: b.swLat, lng: b.swLng }, { lat: b.neLat, lng: b.swLng })
  return { width, height }
}

/** 백엔드 한 변 상한 안에 들어오는지 */
export function isSearchable(b: MapBounds) {
  const { width, height } = boundsSideKm(b)
  return width <= MAX_SIDE_KM && height <= MAX_SIDE_KM
}

/** 두 범위가 거의 같은지 — 지도를 살짝만 움직였으면 "이 지역 검색" 버튼을 띄우지 않음 */
export function nearlySameBounds(a: MapBounds, b: MapBounds, ratio = 0.15) {
  const w = a.neLng - a.swLng
  const h = a.neLat - a.swLat
  return (
    Math.abs(a.swLng - b.swLng) < w * ratio &&
    Math.abs(a.neLng - b.neLng) < w * ratio &&
    Math.abs(a.swLat - b.swLat) < h * ratio &&
    Math.abs(a.neLat - b.neLat) < h * ratio
  )
}

/** "350m", "1.2km" */
export function formatDistance(meters: number | null) {
  if (meters == null) return null
  return meters < 1000 ? `${Math.round(meters / 10) * 10}m` : `${(meters / 1000).toFixed(1)}km`
}

/**
 * 특정 지점으로 열기 — /map?lat=&lng= (홈 지역 바로가기), storeId 가 있으면 그 매장 카드도 (paths.storeOnMap)
 */
export function readMapFocus(params: URLSearchParams): { storeId: number | null; point: LatLng } | null {
  const lat = Number(params.get('lat'))
  const lng = Number(params.get('lng'))
  if (!params.get('lat') || !params.get('lng') || !Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  const storeId = Number(params.get('storeId'))
  return { storeId: Number.isInteger(storeId) && storeId > 0 ? storeId : null, point: { lat, lng } }
}
