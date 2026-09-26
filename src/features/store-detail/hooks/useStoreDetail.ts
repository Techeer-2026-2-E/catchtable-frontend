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
