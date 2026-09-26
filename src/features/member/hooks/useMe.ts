import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { memberApi } from '../api/memberApi'
import { memberKeys } from '../api/queryKeys'

export function useMe(enabled = true) {
  return useQuery({ queryKey: memberKeys.me(), queryFn: memberApi.getMe, enabled })
}

export function useUpdateMe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: memberApi.updateMe,
    onSuccess: (member) => queryClient.setQueryData(memberKeys.me(), member),
  })
}
