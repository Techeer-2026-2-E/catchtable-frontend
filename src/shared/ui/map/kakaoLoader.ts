/* 카카오맵 JS SDK 를 필요한 만큼만 타입으로 적어 둔다 */
export interface KakaoLatLng {
  getLat(): number
  getLng(): number
}
export interface KakaoLatLngBounds {
  getSouthWest(): KakaoLatLng
  getNorthEast(): KakaoLatLng
}
export interface KakaoPoint {
  x: number
  y: number
}
export interface KakaoProjection {
  containerPointFromCoords(latlng: KakaoLatLng): KakaoPoint
  coordsFromContainerPoint(point: KakaoPoint): KakaoLatLng
}
export interface KakaoMap {
  getBounds(): KakaoLatLngBounds
  getCenter(): KakaoLatLng
  getLevel(): number
  getProjection(): KakaoProjection
  setCenter(latlng: KakaoLatLng): void
  panTo(latlng: KakaoLatLng): void
  relayout(): void
}
export interface KakaoCustomOverlay {
  setMap(map: KakaoMap | null): void
}
export interface KakaoMaps {
  load(callback: () => void): void
  LatLng: new (lat: number, lng: number) => KakaoLatLng
  Point: new (x: number, y: number) => KakaoPoint
  Map: new (container: HTMLElement, options: { center: KakaoLatLng; level: number }) => KakaoMap
  CustomOverlay: new (options: {
    position: KakaoLatLng
    content: HTMLElement
    yAnchor?: number
    xAnchor?: number
    zIndex?: number
    clickable?: boolean
  }) => KakaoCustomOverlay
  event: {
    addListener(target: KakaoMap, type: string, handler: () => void): void
    removeListener(target: KakaoMap, type: string, handler: () => void): void
  }
}

declare global {
  interface Window {
    kakao?: { maps: KakaoMaps }
  }
}

let loading: Promise<KakaoMaps> | null = null

/** SDK 스크립트를 한 번만 넣고, autoload=false 라서 maps.load 까지 끝난 뒤 돌려준다 */
export function loadKakaoMaps(appKey: string): Promise<KakaoMaps> {
  if (window.kakao?.maps?.Map) return Promise.resolve(window.kakao.maps)
  if (loading) return loading
  loading = new Promise<KakaoMaps>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false`
    script.async = true
    script.onload = () => {
      const maps = window.kakao?.maps
      if (!maps) return reject(new Error('kakao maps 를 찾을 수 없어요'))
      maps.load(() => resolve(maps))
    }
    script.onerror = () => reject(new Error('카카오맵 스크립트를 불러오지 못했어요'))
    document.head.append(script)
  }).catch((error: unknown) => {
    loading = null
    throw error
  })
  return loading
}
