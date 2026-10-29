import type { ReviewSort, StoreDetail, StoreReviewList } from '@/entities'
import { apiClient } from '@/shared/lib'

export interface StoreReviewParams {
  sort?: ReviewSort
  /** 0부터 */
  page?: number
  /** 1 ~ 50 (기본 10) */
  size?: number
}

export const storeDetailApi = {
  /** 매장 상세 — 백엔드 dev 구현 (영업시간·메뉴 포함) */
  getStore: async (storeId: number) => {
    const { data } = await apiClient.get<StoreDetail>(`/user/stores/${storeId}`)
    return data
  },
  /** 매장 리뷰 목록 — 백엔드 dev 구현 (페이지 단위, 최신순 기본) */
  getReviews: async (storeId: number, params?: StoreReviewParams) => {
    const { data } = await apiClient.get<StoreReviewList>(`/user/stores/${storeId}/reviews`, { params })
    return data
  },
}
