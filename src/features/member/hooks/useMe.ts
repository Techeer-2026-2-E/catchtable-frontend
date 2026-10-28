import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { NotificationSettings } from '@/entities'
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

/** P2: 알림 수신 설정 */
export function useNotificationSettings() {
  return useQuery({ queryKey: memberKeys.notificationSettings(), queryFn: memberApi.getNotificationSettings })
}

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<NotificationSettings>) => memberApi.updateNotificationSettings(body),
    onSuccess: (data) => queryClient.setQueryData(memberKeys.notificationSettings(), data),
  })
}
