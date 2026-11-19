import type { Ref } from 'react'

/** 위도, 경도 — shared 는 entities 를 몰라서 같은 모양을 따로 둔다 */
export interface GeoPoint {
  lat: number
  lng: number
}

/** 화면 사각형 — 남서, 북동 모서리 */
export interface GeoBounds {
  swLat: number
  swLng: number
  neLat: number
  neLng: number
}

export interface MapPin {
  id: number
  lat: number
  lng: number
  /** 매장 이름 — 선택했거나 featured 면 화면에 보인다 */
  label: string
  selected?: boolean
  /** 점 대신 이름과 별점이 든 작은 박스로 그린다 (지도 별점 상위 1~3위) */
  featured?: boolean
  /** featured 박스에 함께 보이는 별점. 없으면 이름만 */
  rating?: number | null
  /** 겹칠 때의 순서 — 작을수록 위 (1이 맨 위). 없으면 맨 아래 */
  rank?: number
}

export interface PanOptions {
  /**
   * 지점을 지도 가운데보다 이만큼(px) 위에 보이게 — 아래 시트가 지도 아래쪽을 가릴 때
   * 지도 범위(onIdle bounds)는 그대로 지도 전체
   */
  offsetY?: number
}

export interface MapHandle {
  /** 부드럽게 이동 */
  panTo: (point: GeoPoint, options?: PanOptions) => void
}

export interface MapViewProps {
  /** 처음 열 때의 가운데. 이후 바뀌어도 지도를 옮기지 않는다 (panTo 사용) */
  initialCenter: GeoPoint
  /** 처음 가운데를 이만큼(px) 위에 보이게 — PanOptions.offsetY 와 같음 */
  initialOffsetY?: number
  pins: MapPin[]
  /** 내 위치 파란 점 */
  myLocation?: GeoPoint | null
  /** 이동, 확대가 끝났을 때마다 — 처음 그린 직후에도 한 번 */
  onIdle: (bounds: GeoBounds, center: GeoPoint) => void
  onPinClick: (id: number) => void
  /** 핀이 아닌 바탕을 눌렀을 때 */
  onMapClick?: () => void
  ref?: Ref<MapHandle>
  className?: string
}
