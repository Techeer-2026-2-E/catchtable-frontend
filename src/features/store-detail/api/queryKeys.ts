export const storeDetailKeys = {
  all: ['store-detail'] as const,
  detail: (storeId: number) => [...storeDetailKeys.all, storeId] as const,
  menus: (storeId: number) => [...storeDetailKeys.detail(storeId), 'menus'] as const,
  tables: (storeId: number) => [...storeDetailKeys.detail(storeId), 'tables'] as const,
}
