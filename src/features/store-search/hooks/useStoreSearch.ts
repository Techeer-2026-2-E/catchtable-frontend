import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { storeSearchKeys } from '../api/queryKeys'
import { storeSearchApi, type StoreSearchParams } from '../api/storeSearchApi'

export function useStoreSearch(params: StoreSearchParams) {
  return useQuery({
    queryKey: storeSearchKeys.list(params),
    queryFn: () => storeSearchApi.searchStores(params),
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
