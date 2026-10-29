import { useQuery } from '@tanstack/react-query'
import type { ReviewSort } from '@/entities'
import { storeDetailKeys } from '../api/queryKeys'
import { storeDetailApi } from '../api/storeDetailApi'

export function useStoreDetail(storeId: number) {
  return useQuery({
    queryKey: storeDetailKeys.detail(storeId),
    queryFn: () => storeDetailApi.getStore(storeId),
    enabled: Number.isFinite(storeId),
  })
}

/** 매장 메뉴 — 별도 API 없이 매장 상세 응답의 menus 를 사용 */
export function useStoreMenus(storeId: number) {
  return useQuery({
    queryKey: storeDetailKeys.detail(storeId),
    queryFn: () => storeDetailApi.getStore(storeId),
    enabled: Number.isFinite(storeId),
    select: (store) => store.menus,
  })
}

/** 매장 리뷰 — 첫 페이지 (size 개) */
export function useStoreReviews(storeId: number, sort: ReviewSort = 'LATEST', size = 20) {
  return useQuery({
    queryKey: storeDetailKeys.reviews(storeId, `${sort}-${size}`),
    queryFn: () => storeDetailApi.getReviews(storeId, { sort, size }),
    enabled: Number.isFinite(storeId),
  })
}
