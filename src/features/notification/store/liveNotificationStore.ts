import { create } from 'zustand'
import { NOTIFICATION_TITLE, type Notification, type NotificationMessage } from '@/entities'

/**
 * 이번 접속 중 SSE 로 받은 알림 — 화면에서만 보관, 새로고침하면 사라짐
 * 알림함 화면은 서버에 저장된 알림(GET /api/user/notifications)을 쓴다
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
      if (state.items.some((n) => n.id === message.eventId)) return state
      const item: Notification = {
        id: message.eventId,
        type: message.type,
        targetId: message.targetId,
        title: NOTIFICATION_TITLE[message.type],
        message: message.message,
        createdAt: message.occurredAt,
      }
      return { items: [item, ...state.items].slice(0, MAX_ITEMS) }
    }),
  clear: () => set({ items: [] }),
}))
