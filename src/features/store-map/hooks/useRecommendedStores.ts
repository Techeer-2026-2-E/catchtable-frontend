import { useMemo } from 'react'
import type { LatLng, MapStore } from '@/entities'
import { useNearbyStores } from './useStoreMap'

/** 추천에 쓰는 지역 — 입점 매장(데모 포함)이 모여 있는 곳 */
export const RECOMMEND_AREAS: { name: string; center: LatLng }[] = [
  { name: '강남역', center: { lat: 37.4979, lng: 127.0276 } },
  { name: '성수', center: { lat: 37.5446, lng: 127.0559 } },
  { name: '홍대입구', center: { lat: 37.5572, lng: 126.9245 } },
]

/** 지역마다 가까운 매장 이만큼을 받아 그중 입점 매장만 고른다 (홈 지역 추천과 같은 크기라 조회가 겹친다) */
export const RECOMMEND_FETCH_SIZE = 30

/** 별점 높은 순, 같으면 리뷰 많은 순 */
export const byRating = (a: MapStore, b: MapStore) =>
  (b.ratingAverage ?? 0) - (a.ratingAverage ?? 0) || b.reviewCount - a.reviewCount

/**
 * 추천 매장 — 추천 지역 근처 입점 매장 중 리뷰가 있는 곳을 별점 순으로
 * 따로 추천 API 가 없어 반경 조회(GET /user/stores/map/radius) 세 번을 합친다
 */
export function useRecommendedStores() {
  const a = useNearbyStores(RECOMMEND_AREAS[0].center, RECOMMEND_FETCH_SIZE)
  const b = useNearbyStores(RECOMMEND_AREAS[1].center, RECOMMEND_FETCH_SIZE)
  const c = useNearbyStores(RECOMMEND_AREAS[2].center, RECOMMEND_FETCH_SIZE)
  const stores = useMemo(() => {
    const byId = new Map<number, MapStore>()
    for (const s of [...(a.data?.stores ?? []), ...(b.data?.stores ?? []), ...(c.data?.stores ?? [])]) {
      if (s.reservationEnabled && s.reviewCount > 0) byId.set(s.id, s)
    }
    return [...byId.values()].sort(byRating)
  }, [a.data, b.data, c.data])
  return {
    stores,
    isPending: a.isPending || b.isPending || c.isPending,
    isError: a.isError && b.isError && c.isError,
  }
}
