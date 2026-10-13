import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useDebounce } from '@/shared/hooks'
import { storeSearchKeys } from '../api/queryKeys'
import { storeSearchApi, type StoreSearchParams } from '../api/storeSearchApi'

export function useStoreSearch(params: StoreSearchParams) {
  const keyword = useDebounce(params.keyword ?? '', 300)
  const debouncedParams = { ...params, keyword: keyword || undefined }

  return useQuery({
    queryKey: storeSearchKeys.list(debouncedParams),
    queryFn: () => storeSearchApi.searchStores(debouncedParams),
    placeholderData: keepPreviousData,
  })
}

export function useHomeStores(position?: { latitude: number; longitude: number } | null) {
  return useQuery({
    queryKey: storeSearchKeys.home(position?.latitude, position?.longitude),
    queryFn: () => storeSearchApi.getHomeStores(position ?? undefined),
    placeholderData: keepPreviousData,
  })
}

export function useCategories() {
  return useQuery({
    queryKey: storeSearchKeys.categories(),
    queryFn: storeSearchApi.getCategories,
    staleTime: Infinity,
  })
}
