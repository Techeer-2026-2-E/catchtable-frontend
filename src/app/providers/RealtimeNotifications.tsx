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

  // 이용 내역(GET /api/user/reservations?type=…)은 예약·웨이팅을 함께 보여주므로 두 쪽을 모두 갱신
  const refreshAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: waitingKeys.all })
    queryClient.invalidateQueries({ queryKey: reservationKeys.all })
  }, [queryClient])

  const onMessage = useCallback(
    (message: NotificationMessage) => {
      refreshAll()
      // 방금 한 예약의 확정은 화면에서 이미 안내하고, 순번 변경은 웨이팅 화면 숫자로 보여주므로 토스트 생략
      if (message.type !== 'RESERVATION_CONFIRMED' && message.type !== 'WAITING_POSITION_CHANGED') toast(message.message)
    },
    [refreshAll],
  )

  // 연결·재연결("connect") 때는 끊긴 동안 놓친 변화가 있을 수 있어 다시 조회 (서버가 이벤트를 재생하지 않음)
  useNotificationStream(member?.userType === 'CUSTOMER' ? member.id : null, onMessage, refreshAll)
  return null
}
