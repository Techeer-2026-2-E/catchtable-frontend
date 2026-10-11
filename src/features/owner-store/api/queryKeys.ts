import type { SalesPeriod } from '@/entities'

export const ownerStoreKeys = {
  all: ['owner-stores'] as const,
  list: () => [...ownerStoreKeys.all, 'list'] as const,
  tables: (storeId: number) => [...ownerStoreKeys.all, storeId, 'tables'] as const,
  businessHours: (storeId: number) => [...ownerStoreKeys.all, storeId, 'business-hours'] as const,
  policy: (storeId: number) => [...ownerStoreKeys.all, storeId, 'reservation-policy'] as const,
  menus: (storeId: number) => [...ownerStoreKeys.all, storeId, 'menus'] as const,
  reviews: (storeId: number) => [...ownerStoreKeys.all, storeId, 'reviews'] as const,
  sales: (storeId: number, period: SalesPeriod) => [...ownerStoreKeys.all, storeId, 'sales', period] as const,
}
