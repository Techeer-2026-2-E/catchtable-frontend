import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { storeSearchKeys } from '../api/queryKeys'
import { storeSearchApi, type StoreSearchParams } from '../api/storeSearchApi'

export function useStoreSearch(params: StoreSearchParams) {
  return useInfiniteQuery({
    queryKey: storeSearchKeys.list(params),
    initialPageParam: 0,
    queryFn: ({ pageParam }) => storeSearchApi.searchStores({ ...params, page: pageParam, size: 10 }),
    getNextPageParam: (page) => (page.hasNext ? page.page + 1 : undefined),
    select: (data) => data.pages.flatMap((page) => page.stores),
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
