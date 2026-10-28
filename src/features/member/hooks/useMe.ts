import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { memberApi, type UpdateMeRequest } from '../api/memberApi'
import { memberKeys } from '../api/queryKeys'

export function useMe() {
  return useQuery({ queryKey: memberKeys.me(), queryFn: memberApi.getMe })
}

export function useUpdateMe() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateMeRequest) => memberApi.updateMe(body),
    onSuccess: (updated) => queryClient.setQueryData(memberKeys.me(), updated),
  })
}
