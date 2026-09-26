import type { StoreSearchParams } from './storeSearchApi'

export const storeSearchKeys = {
  all: ['store-search'] as const,
  home: () => [...storeSearchKeys.all, 'home'] as const,
  categories: () => [...storeSearchKeys.all, 'categories'] as const,
  list: (params: StoreSearchParams) => [...storeSearchKeys.all, 'list', params] as const,
  popular: () => [...storeSearchKeys.all, 'popular'] as const,
  recent: () => [...storeSearchKeys.all, 'recent'] as const,
}
