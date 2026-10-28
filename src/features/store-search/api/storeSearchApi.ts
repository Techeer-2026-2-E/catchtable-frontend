import type { Category, Store, StoreCategory } from '@/entities'
import { isFeatureAvailable } from '@/shared/config'
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
  /** [목 전용] 키워드 검색 — 백엔드 조건에 없어 응답을 받은 뒤 이름·주소로 거름 */
  keyword?: string
  /** [목 전용] 웨이팅 가능 매장만 — 응답을 받은 뒤 거름 */
  waitingAvailable?: boolean
}

/** 백엔드가 모르는 조건(keyword·waitingAvailable)은 응답에서 직접 거름 */
const filterLocally = (stores: Store[], { keyword, waitingAvailable }: StoreSearchParams) => {
  const q = keyword?.trim().toLowerCase()
  return stores.filter(
    (s) =>
      (!q || s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q)) &&
      (!waitingAvailable || s.waitingAvailable),
  )
}

export const storeSearchApi = {
  /** 카테고리 목록 — 백엔드 dev 구현 */
  getCategories: async () => {
    const { data } = await apiClient.get<Category[]>('/user/categories')
    return data
  },
  /** 조건별 매장 목록 — 백엔드 dev 구현 (페이징 없이 목록) */
  searchStores: async (params: StoreSearchParams) => {
    const { keyword: _k, waitingAvailable: _w, ...backendParams } = params
    const { data } = await apiClient.get<Store[]>('/user/stores', { params: backendParams })
    return filterLocally(data, params)
  },
  /**
   * [P2] 주변·인기 매장 — GET /api/user/stores/home (노션 명세, 응답은 제안)
   * 백엔드에 없으면 전체 매장 목록으로 대신 구성 (주변 매장은 비움)
   */
  getHomeStores: async (params?: { latitude?: number; longitude?: number }): Promise<HomeStoresResponse> => {
    if (!isFeatureAvailable('homeStores')) {
      const { data } = await apiClient.get<Store[]>('/user/stores')
      return { nearby: [], popular: data, waitingNow: data.filter((s) => s.waitingAvailable) }
    }
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
