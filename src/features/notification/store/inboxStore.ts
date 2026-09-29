import { create } from 'zustand'
import type { Notification } from '@/entities'
import { MOCK_NOTIFICATIONS } from '@/entities/mock'

/**
 * 알림함 상태 — 알림 화면과 하단 탭바 안 읽음 뱃지가 같은 값을 보도록 공유
 * TODO(API 연동): useNotifications()/useReadNotification() 로 교체하고,
 * 새 알림은 SSE 로 받아 query 캐시에 추가
 */
interface InboxState {
  items: Notification[]
  read: (id: number) => void
  readAll: () => void
}

export const useInboxStore = create<InboxState>((set) => ({
  items: MOCK_NOTIFICATIONS,
  read: (id) => set((s) => ({ items: s.items.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
  readAll: () => set((s) => ({ items: s.items.map((n) => ({ ...n, read: true })) })),
}))

export const useUnreadCount = () => useInboxStore((s) => s.items.filter((n) => !n.read).length)
