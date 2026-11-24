import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import type { NotificationInbox } from '@/entities'
import { notificationApi } from '../api/notificationApi'
import { notificationKeys } from '../api/queryKeys'

const PAGE_SIZE = 20

/** 안 읽은 알림이 있는지 — 로그인한 고객만 조회 */
export function useHasUnreadNotification(enabled: boolean) {
  return useQuery({
    queryKey: notificationKeys.unread(),
    queryFn: notificationApi.getUnread,
    select: (res) => res.hasUnread,
    enabled,
  })
}

/** 알림함 — 최신순, 20개씩 더 보기 */
export function useNotificationInbox() {
  return useInfiniteQuery({
    queryKey: notificationKeys.inbox(),
    queryFn: ({ pageParam }) => notificationApi.getInbox({ lastId: pageParam, size: PAGE_SIZE }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (last) => (last.hasNext ? (last.nextLastId ?? undefined) : undefined),
  })
}

/** lastId 까지 읽음 — 빨간 점만 다시 확인하고, 목록은 다시 받지 않는다 (이번 방문에서는 "새 알림"으로 남겨 둠) */
export function useMarkNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: notificationApi.markRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.unread() }),
  })
}

/** 알림 1건 삭제 — 목록에서 먼저 빼고, 실패하면 되돌린다 */
export function useDeleteNotification() {
  const queryClient = useQueryClient()
  const key = notificationKeys.inbox()
  return useMutation({
    mutationFn: notificationApi.remove,
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<InfiniteData<NotificationInbox>>(key)
      queryClient.setQueryData<InfiniteData<NotificationInbox>>(key, (data) =>
        data && { ...data, pages: data.pages.map((p) => ({ ...p, notifications: p.notifications.filter((n) => n.id !== id) })) },
      )
      return { previous }
    },
    onError: (_error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    // 안 읽은 알림을 지웠을 수도 있어 빨간 점 다시 확인
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationKeys.unread() }),
  })
}
