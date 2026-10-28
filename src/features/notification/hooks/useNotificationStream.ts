import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { NotificationMessage, NotificationType } from '@/entities'
import { notificationApi } from '../api/notificationApi'
import { notificationKeys } from '../api/queryKeys'

const EVENT_TYPES: NotificationType[] = [
  'RESERVATION_CONFIRMED',
  'RESERVATION_CANCELED',
  'WAITING_CALLED',
  'WAITING_EXPIRED',
  'WAITING_CANCELED',
]

/**
 * 실시간 알림(SSE) 구독 — 로그인한 동안 한 번만 연결
 * 알림이 오면 알림 목록을 갱신하고 onMessage 로 넘겨 다른 화면 데이터도 갱신하게 함
 */
export function useNotificationStream(memberId: number | null, onMessage?: (message: NotificationMessage) => void) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (memberId == null || typeof EventSource === 'undefined') return
    const source = new EventSource(notificationApi.subscribeUrl(memberId))

    const handle = (event: Event) => {
      try {
        const message = JSON.parse((event as MessageEvent<string>).data) as NotificationMessage
        queryClient.invalidateQueries({ queryKey: notificationKeys.all })
        onMessage?.(message)
      } catch {
        /* 알 수 없는 형식 — 무시 */
      }
    }
    EVENT_TYPES.forEach((type) => source.addEventListener(type, handle))
    // EventSource 는 끊기면 자동 재연결

    return () => source.close()
  }, [memberId, onMessage, queryClient])
}
