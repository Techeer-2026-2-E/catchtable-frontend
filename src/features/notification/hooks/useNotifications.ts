import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Notification } from '@/entities'
import { notificationApi } from '../api/notificationApi'
import { notificationKeys } from '../api/queryKeys'

export function useNotifications(enabled = true) {
  return useQuery({ queryKey: notificationKeys.list(), queryFn: notificationApi.getList, enabled })
}

/** 하단 탭바 뱃지용 안 읽은 알림 수 */
export function useUnreadCount(enabled = true) {
  const { data } = useNotifications(enabled)
  return data?.filter((n) => !n.read).length ?? 0
}

export function useReadNotification() {
  const queryClient = useQueryClient()
  const markRead = (predicate: (n: Notification) => boolean) =>
    queryClient.setQueryData<Notification[]>(notificationKeys.list(), (list) =>
      list?.map((n) => (predicate(n) ? { ...n, read: true } : n)),
    )

  return {
    // 낙관적 업데이트 — 탭하자마자 읽음 표시
    read: useMutation({
      mutationFn: notificationApi.read,
      onMutate: (id: number) => markRead((n) => n.id === id),
    }),
    readAll: useMutation({
      mutationFn: notificationApi.readAll,
      onMutate: () => markRead(() => true),
    }),
  }
}
