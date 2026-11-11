import { useQueries, useQuery } from '@tanstack/react-query'
import { ownerStoreKeys } from '../api/queryKeys'
import { ownerStoreApi } from '../api/ownerStoreApi'

/** 기간 합계 */
export function useSales(storeId: number, from: string, to: string) {
  return useQuery({
    queryKey: ownerStoreKeys.sales(storeId, from, to),
    queryFn: () => ownerStoreApi.getSales(storeId, from, to),
    enabled: Number.isFinite(storeId) && !!from && !!to && from <= to,
  })
}

/**
 * 날짜별 매출 — API 가 기간 합계만 줘서 하루씩 조회 (막대 그래프용)
 * 하루 범위 응답은 합계 조회와 키가 같아서 같은 날을 다시 부르지 않음
 */
export function useDailySales(storeId: number, days: string[]) {
  return useQueries({
    queries: days.map((day) => ({
      queryKey: ownerStoreKeys.sales(storeId, day, day),
      queryFn: () => ownerStoreApi.getSales(storeId, day, day),
      enabled: Number.isFinite(storeId),
    })),
    combine: (results) => ({
      data: results.every((r) => r.data) ? results.map((r) => r.data!) : null,
      isPending: results.some((r) => r.isPending),
      isError: results.some((r) => r.isError),
      refetch: () => results.forEach((r) => r.isError && r.refetch()),
    }),
  })
}
