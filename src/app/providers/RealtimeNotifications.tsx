import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { NotificationMessage } from '@/entities'
import { useAuthStore } from '@/features/auth'
import { useNotificationStream } from '@/features/notification'
import { reservationKeys } from '@/features/reservation'
import { waitingKeys } from '@/features/waiting'
import { toast } from '@/shared/ui'

/**
 * 실시간 알림(SSE) 연결 — 알림이 오면 관련 화면 데이터를 갱신하고 토스트로 알려줌
 * (feature 끼리 서로 import 하지 않도록 app 레이어에서 연결)
 */
export function RealtimeNotifications() {
  const member = useAuthStore((s) => s.member)
  const queryClient = useQueryClient()

  const onMessage = useCallback(
    (message: NotificationMessage) => {
      if (message.type.startsWith('WAITING')) {
        queryClient.invalidateQueries({ queryKey: waitingKeys.all })
      } else {
        queryClient.invalidateQueries({ queryKey: reservationKeys.all })
      }
      // 내가 방금 한 예약의 확정 알림은 화면에서 이미 안내하므로 토스트 생략
      if (message.type !== 'RESERVATION_CONFIRMED') toast(message.message)
    },
    [queryClient],
  )

  useNotificationStream(member?.userType === 'CUSTOMER' ? member.id : null, onMessage)
  return null
}
