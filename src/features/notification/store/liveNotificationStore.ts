import { create } from 'zustand'
import { NOTIFICATION_TITLE, type Notification, type NotificationMessage } from '@/entities'

/**
 * 이번 접속 중 SSE 로 받은 알림 — 백엔드에 알림함 목록 API 가 없을 때 알림 화면에 대신 보여줌
 * 새로고침하면 사라짐 (서버에 저장된 알림이 아님)
 */
interface LiveNotificationState {
  items: Notification[]
  push: (message: NotificationMessage) => void
  clear: () => void
}

const MAX_ITEMS = 50

export const useLiveNotificationStore = create<LiveNotificationState>((set) => ({
  items: [],
  push: (message) =>
    set((state) => {
      if (state.items.some((n) => String(n.id) === message.eventId)) return state
      const item: Notification = {
        // eventId(UUID)를 그대로 쓰기 위해 목록 id 자리에 문자열을 둠 — 읽음 처리 API 는 쓰지 않음
        id: message.eventId as unknown as number,
        type: message.type,
        targetId: message.targetId,
        title: NOTIFICATION_TITLE[message.type],
        message: message.message,
        read: true,
        createdAt: message.occurredAt,
      }
      return { items: [item, ...state.items].slice(0, MAX_ITEMS) }
    }),
  clear: () => set({ items: [] }),
}))
