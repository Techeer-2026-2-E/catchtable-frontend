import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ownerStoreApi, type UpdateStoreRequest } from '../api/ownerStoreApi'
import { ownerStoreKeys } from '../api/queryKeys'

export function useMyStores() {
  return useQuery({ queryKey: ownerStoreKeys.list(), queryFn: ownerStoreApi.getMyStores })
}

export function useCreateStore() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ownerStoreApi.createStore,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ownerStoreKeys.list() }),
  })
}

export function useUpdateStore(storeId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: UpdateStoreRequest) => ownerStoreApi.updateStore(storeId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ownerStoreKeys.list() }),
  })
}
