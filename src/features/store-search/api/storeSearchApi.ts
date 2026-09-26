import type { PageResponse, Store, StoreCategory } from '@/entities'
import { apiClient } from '@/shared/lib'

export interface StoreSearchParams {
  keyword?: string
  category?: StoreCategory
  page?: number
  size?: number
}

export interface Category {
  code: StoreCategory
  name: string
}

export const storeSearchApi = {
  /** 메인 — 주변 매장 조회 */
  getHomeStores: async (params?: { lat?: number; lng?: number }) => {
    const { data } = await apiClient.get<Store[]>('/user/stores/home', { params })
    return data
  },
  /** 카테고리 목록 */
  getCategories: async () => {
    const { data } = await apiClient.get<Category[]>('/user/categories')
    return data
  },
  /** 조건별 매장 목록 */
  searchStores: async (params: StoreSearchParams) => {
    const { data } = await apiClient.get<PageResponse<Store>>('/user/stores', { params })
    return data
  },
  /** 검색 진입 화면 */
  getSearchHome: async () => {
    const { data } = await apiClient.get('/user/search/home')
    return data
  },
  /** 인기 검색어 */
  getPopularKeywords: async () => {
    const { data } = await apiClient.get<string[]>('/user/search/popular')
    return data
  },
  /** 최근 검색 */
  getRecentKeywords: async () => {
    const { data } = await apiClient.get<string[]>('/user/members/me/recent')
    return data
  },
  /** 최근 검색 기록 삭제 */
  deleteRecentKeywords: async () => {
    await apiClient.delete('/user/members/me/recent-delete')
  },
}
