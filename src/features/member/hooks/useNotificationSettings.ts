import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { NotificationSettings } from '@/entities'
import { memberApi } from '../api/memberApi'
import { memberKeys } from '../api/queryKeys'

export function useNotificationSettings() {
  return useQuery({ queryKey: memberKeys.notificationSettings(), queryFn: memberApi.getNotificationSettings })
}

/** 토글 즉시 저장 — 화면은 먼저 바꾸고 실패하면 되돌림 */
export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient()
  const key = memberKeys.notificationSettings()
  return useMutation({
    mutationFn: (body: NotificationSettings) => memberApi.updateNotificationSettings(body),
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<NotificationSettings>(key)
      queryClient.setQueryData(key, body)
      return { previous }
    },
    onError: (_e, _body, context) => queryClient.setQueryData(key, context?.previous),
    onSuccess: (data) => queryClient.setQueryData(key, data),
  })
}
