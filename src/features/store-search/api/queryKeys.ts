import type { StoreSearchParams } from './storeSearchApi'

export const storeSearchKeys = {
  all: ['store-search'] as const,
  categories: () => [...storeSearchKeys.all, 'categories'] as const,
  list: (params: StoreSearchParams) => [...storeSearchKeys.all, 'list', params] as const,
}
