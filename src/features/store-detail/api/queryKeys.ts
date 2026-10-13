export const storeDetailKeys = {
  all: ['store-detail'] as const,
  detail: (storeId: number) => [...storeDetailKeys.all, storeId] as const,
  menus: (storeId: number) => [...storeDetailKeys.detail(storeId), 'menus'] as const,
  reviews: (storeId: number, sort?: string) => [...storeDetailKeys.detail(storeId), 'reviews', sort] as const,
}
