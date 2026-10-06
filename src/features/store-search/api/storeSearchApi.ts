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
  /** [목 전용] 키워드 검색 — 백엔드 조건에 아직 없음 */
  keyword?: string
  /** [목 전용] 웨이팅 가능 매장만 */
  waitingAvailable?: boolean
}

export const storeSearchApi = {
  /** 카테고리 목록 — 백엔드 dev 구현 */
  getCategories: async () => {
    const { data } = await apiClient.get<Category[]>('/user/categories')
    return data
  },
  /** 조건별 매장 목록 — 백엔드 dev 구현 (페이징 없이 목록) */
  searchStores: async (params: StoreSearchParams) => {
    const { data } = await apiClient.get<Store[]>('/user/stores', { params })
    return data
  },
  /** [P2] 주변·인기 매장 — GET /api/user/stores/home (노션 명세, 응답은 제안) */
  getHomeStores: async (params?: { latitude?: number; longitude?: number }) => {
    const { data } = await apiClient.get<HomeStoresResponse>('/user/stores/home', { params })
    return data
  },
}

export interface HomeStoresResponse {
  /** 위치를 보낸 경우 가까운 순 */
  nearby: Store[]
  /** 평점·리뷰 많은 순 */
  popular: Store[]
  /** 지금 웨이팅 가능한 매장 */
  waitingNow: Store[]
}
