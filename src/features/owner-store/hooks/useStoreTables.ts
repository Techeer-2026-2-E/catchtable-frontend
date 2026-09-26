import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ownerStoreApi, type CreateTableRequest, type UpdateTableRequest } from '../api/ownerStoreApi'
import { ownerStoreKeys } from '../api/queryKeys'

export function useStoreTables(storeId: number) {
  return useQuery({
    queryKey: ownerStoreKeys.tables(storeId),
    queryFn: () => ownerStoreApi.getTables(storeId),
    enabled: Number.isFinite(storeId),
  })
}

export function useStoreTableMutations(storeId: number) {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ownerStoreKeys.tables(storeId) })

  return {
    create: useMutation({
      mutationFn: (body: CreateTableRequest) => ownerStoreApi.createTable(storeId, body),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ tableId, ...body }: UpdateTableRequest & { tableId: number }) =>
        ownerStoreApi.updateTable(storeId, tableId, body),
      onSuccess: invalidate,
    }),
  }
}
