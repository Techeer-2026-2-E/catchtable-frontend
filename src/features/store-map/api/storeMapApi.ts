import type { LatLng, MapBounds, MapMarkerList, MapStoreList } from '@/entities'
import { apiClient } from '@/shared/lib'

export interface MapPage {
  page?: number
  /** 1~50, 기본 10 */
  size?: number
}

/**
 * 지도 매장 조회 — 백엔드 UserStoreController
 * - 핀: 화면 크기 제한 없음, 별점 상위 15개
 * - 목록: 화면 범위 한 변 최대 5km (store.map.max-side-km). 넘으면 400
 */
export const storeMapApi = {
  /** 화면 범위 안의 핀 — 별점 상위순 (위치, 이름, 별점, 순위) */
  getMarkers: async (bounds: MapBounds) => {
    const { data } = await apiClient.get<MapMarkerList>('/user/stores/map/bounds/markers', { params: bounds })
    return data
  },
  /** 화면 범위 안의 매장 목록 — 내 위치(lat, lng)에서 가까운 순. 한 변 5km 이하만 */
  getStoresInBounds: async (bounds: MapBounds, me: LatLng, page: MapPage = {}) => {
    const { data } = await apiClient.get<MapStoreList>('/user/stores/map/bounds', {
      params: { ...bounds, lat: me.lat, lng: me.lng, ...page },
    })
    return data
  },
  /** 내 위치 반경(기본 1km) 매장 목록 */
  getStoresNearby: async (me: LatLng, page: MapPage = {}) => {
    const { data } = await apiClient.get<MapStoreList>('/user/stores/map/radius', { params: { lat: me.lat, lng: me.lng, ...page } })
    return data
  },
}
