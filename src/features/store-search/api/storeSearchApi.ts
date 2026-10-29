import type { Category, Store, StoreCategory } from '@/entities'
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
}

export const storeSearchApi = {
  /** 카테고리 목록 */
  getCategories: async () => {
    const { data } = await apiClient.get<Category[]>('/user/categories')
    return data
  },
  /** 조건별 매장 목록 — 페이징 없이 전체 목록 */
  searchStores: async (params: StoreSearchParams) => {
    const { data } = await apiClient.get<Store[]>('/user/stores', { params })
    return data
  },
}
