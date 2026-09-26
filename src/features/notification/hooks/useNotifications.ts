import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notificationApi } from '../api/notificationApi'
import { notificationKeys } from '../api/queryKeys'

export function useNotifications() {
  return useQuery({ queryKey: notificationKeys.list(), queryFn: notificationApi.getList })
}

export function useReadNotification() {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: notificationKeys.all })

  return {
    read: useMutation({ mutationFn: notificationApi.read, onSuccess: invalidate }),
    readAll: useMutation({ mutationFn: notificationApi.readAll, onSuccess: invalidate }),
  }
}
