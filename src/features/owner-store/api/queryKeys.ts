export const ownerStoreKeys = {
  all: ['owner-stores'] as const,
  list: () => [...ownerStoreKeys.all, 'list'] as const,
  tables: (storeId: number) => [...ownerStoreKeys.all, storeId, 'tables'] as const,
}
