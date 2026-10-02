import { create } from 'zustand'
import type { Member } from '@/entities'
import { tokenStorage } from '@/shared/lib'

interface AuthState {
  member: Member | null
  isAuthenticated: boolean
  setAuth: (accessToken: string, member: Member) => void
  setMember: (member: Member) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  member: null,
  isAuthenticated: !!tokenStorage.get(),
  setAuth: (accessToken, member) => {
    tokenStorage.set(accessToken)
    set({ member, isAuthenticated: true })
  },
  setMember: (member) => set({ member }),
  clearAuth: () => {
    tokenStorage.clear()
    set({ member: null, isAuthenticated: false })
  },
}))

// 토큰 재발급 실패 시(shared/lib/axios) 로그아웃 처리
window.addEventListener('auth:logout', () => useAuthStore.getState().clearAuth())
