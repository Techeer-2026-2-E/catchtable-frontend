import type { Category, StoreCategory, StoreList } from '@/entities'
import { apiClient } from '@/shared/lib'

/**
 * GET /api/user/stores — 백엔드 StoreSearchCondition
 * date·time 은 함께 보내야 함 (하나만 보내면 400)
 */
export interface StoreSearchParams {
  category?: StoreCategory
  /** YYYY-MM-DD */
  date?: string
  /** HH:mm */
  time?: string
  partySize?: number
  keyword?: string
}

export const storeSearchApi = {
  /** 카테고리 목록 */
  getCategories: async () => {
    const { data } = await apiClient.get<Category[]>('/user/categories')
    return data
  },
  /** 조건별 매장 목록 — 0부터 시작하는 페이지, 기본 10개 */
  searchStores: async (params: StoreSearchParams & { page?: number; size?: number }) => {
    const { data } = await apiClient.get<StoreList>('/user/stores', { params })
    return data
  },
}
