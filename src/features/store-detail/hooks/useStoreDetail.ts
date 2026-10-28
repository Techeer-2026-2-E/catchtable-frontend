import { useQuery } from '@tanstack/react-query'
import { storeDetailKeys } from '../api/queryKeys'
import { storeDetailApi } from '../api/storeDetailApi'

export function useStoreDetail(storeId: number) {
  return useQuery({
    queryKey: storeDetailKeys.detail(storeId),
    queryFn: () => storeDetailApi.getStore(storeId),
    enabled: Number.isFinite(storeId),
  })
}

export function useStoreMenus(storeId: number) {
  return useQuery({
    queryKey: storeDetailKeys.menus(storeId),
    queryFn: () => storeDetailApi.getMenus(storeId),
    enabled: Number.isFinite(storeId),
  })
}

/** P2: 매장 리뷰 */
export function useStoreReviews(storeId: number, sort?: 'latest' | 'rating') {
  return useQuery({
    queryKey: storeDetailKeys.reviews(storeId, sort),
    queryFn: () => storeDetailApi.getReviews(storeId, { sort }),
    enabled: Number.isFinite(storeId),
  })
}
