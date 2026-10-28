import { create } from 'zustand'

interface ToastState {
  message: string | null
  key: number
  show: (message: string) => void
  hide: () => void
}

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  key: 0,
  show: (message) => set((s) => ({ message, key: s.key + 1 })),
  hide: () => set({ message: null }),
}))

/** 액션 결과 피드백 — toast('저장했어요') */
export const toast = (message: string) => useToastStore.getState().show(message)

