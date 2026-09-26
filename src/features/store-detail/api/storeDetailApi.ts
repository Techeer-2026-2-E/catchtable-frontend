import type { Menu, StoreDetail, StoreTable } from '@/entities'
import { apiClient } from '@/shared/lib'

export const storeDetailApi = {
  getStore: async (storeId: number) => {
    const { data } = await apiClient.get<StoreDetail>(`/user/stores/${storeId}`)
    return data
  },
  getMenus: async (storeId: number) => {
    const { data } = await apiClient.get<Menu[]>(`/user/stores/${storeId}/menus`)
    return data
  },
  /** 잔여 테이블 */
  getTables: async (storeId: number) => {
    const { data } = await apiClient.get<StoreTable[]>(`/user/stores/${storeId}/tables`)
    return data
  },
  /** 리뷰 목록 — P2 */
  getReviews: async (storeId: number) => {
    const { data } = await apiClient.get(`/user/stores/${storeId}/reviews`)
    return data
  },
}
