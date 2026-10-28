import type { Menu, Review, ReviewSummary, StoreDetail } from '@/entities'
import { apiClient } from '@/shared/lib'

export const storeDetailApi = {
  /** 매장 상세 — 백엔드 dev 구현 (영업시간 포함) */
  getStore: async (storeId: number) => {
    const { data } = await apiClient.get<StoreDetail>(`/user/stores/${storeId}`)
    return data
  },
  /** 매장 메뉴 — 노션 명세 (백엔드 미구현) */
  getMenus: async (storeId: number) => {
    const { data } = await apiClient.get<Menu[]>(`/user/stores/${storeId}/menus`)
    return data
  },
  /** [P2] 매장 리뷰 목록 — 노션 명세, 응답은 제안 */
  getReviews: async (storeId: number, params?: { sort?: 'latest' | 'rating' }) => {
    const { data } = await apiClient.get<StoreReviewsResponse>(`/user/stores/${storeId}/reviews`, { params })
    return data
  },
}

export interface StoreReviewsResponse {
  summary: ReviewSummary
  reviews: Review[]
}
