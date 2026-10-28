import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { NotificationMessage, NotificationType } from '@/entities'
import { notificationApi } from '../api/notificationApi'
import { notificationKeys } from '../api/queryKeys'
import { useLiveNotificationStore } from '../store/liveNotificationStore'

/** 고객 SSE 로 오는 이벤트 이름 (WAITING_CHANGED 는 점주 구독 전용) */
const EVENT_TYPES: NotificationType[] = [
  'RESERVATION_CONFIRMED',
  'RESERVATION_CANCELED',
  'RESERVATION_CHANGED',
  'WAITING_CALLED',
  'WAITING_EXPIRED',
  'WAITING_CANCELED',
  'WAITING_POSITION_CHANGED',
]

/**
 * 실시간 알림(SSE) 구독 — 로그인한 동안 한 번만 연결
 * 알림이 오면 알림 목록을 갱신하고 onMessage 로 넘겨 다른 화면 데이터도 갱신하게 함
 */
export function useNotificationStream(
  memberId: number | null,
  onMessage?: (message: NotificationMessage) => void,
  /** 연결·재연결 직후 ("connect" 이벤트) — 끊긴 동안 놓친 변경은 재생되지 않으므로 다시 조회 */
  onConnect?: () => void,
) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (memberId == null || typeof EventSource === 'undefined') return
    const source = new EventSource(notificationApi.subscribeUrl(memberId))

    const handle = (event: Event) => {
      try {
        const message = JSON.parse((event as MessageEvent<string>).data) as NotificationMessage
        queryClient.invalidateQueries({ queryKey: notificationKeys.all })
        useLiveNotificationStore.getState().push(message)
        onMessage?.(message)
      } catch {
        /* 알 수 없는 형식 — 무시 */
      }
    }
    const connected = () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
      onConnect?.()
    }
    EVENT_TYPES.forEach((type) => source.addEventListener(type, handle))
    source.addEventListener('connect', connected)
    // EventSource 는 끊기면 자동 재연결

    return () => source.close()
  }, [memberId, onMessage, onConnect, queryClient])
}
