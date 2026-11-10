import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import type { LatLng, MapBounds } from '@/entities'
import { storeMapKeys } from '../api/queryKeys'
import { storeMapApi } from '../api/storeMapApi'

const PAGE_SIZE = 10

/** 검색한 화면 범위의 핀. bounds 가 null 이면 아직 검색 전 */
export function useMapMarkers(bounds: MapBounds | null) {
  return useQuery({
    queryKey: storeMapKeys.markers(bounds ?? { swLat: 0, swLng: 0, neLat: 0, neLng: 0 }),
    queryFn: () => storeMapApi.getMarkers(bounds!),
    enabled: !!bounds,
    placeholderData: keepPreviousData,
  })
}

/** 검색한 화면 범위의 매장 목록 — 가까운 순, 10개씩 더 보기 */
export function useMapStores(bounds: MapBounds | null, me: LatLng) {
  return useInfiniteQuery({
    queryKey: storeMapKeys.list(bounds ?? { swLat: 0, swLng: 0, neLat: 0, neLng: 0 }, me),
    queryFn: ({ pageParam }) => storeMapApi.getStoresInBounds(bounds!, me, { page: pageParam, size: PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.hasNext ? last.page + 1 : undefined),
    enabled: !!bounds,
  })
}

/** 내 위치 반경 매장 — 홈 "내 주변 매장" 용 */
export function useNearbyStores(me: LatLng | null, size = PAGE_SIZE) {
  return useQuery({
    queryKey: [...storeMapKeys.nearby(me ?? { lat: 0, lng: 0 }), size],
    queryFn: () => storeMapApi.getStoresNearby(me!, { size }),
    enabled: !!me,
  })
}
