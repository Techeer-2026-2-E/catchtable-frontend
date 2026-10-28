import { create } from 'zustand'
import type { Member } from '@/entities'
import { memberIdStorage, tokenStorage } from '@/shared/lib'

const MEMBER_KEY = 'member'

/** 새로고침해도 회원 유형(고객/점주)을 알 수 있도록 회원 정보도 보관 */
const loadMember = (): Member | null => {
  try {
    const raw = localStorage.getItem(MEMBER_KEY)
    return raw ? (JSON.parse(raw) as Member) : null
  } catch {
    return null
  }
}
const saveMember = (member: Member | null) => {
  try {
    if (member) localStorage.setItem(MEMBER_KEY, JSON.stringify(member))
    else localStorage.removeItem(MEMBER_KEY)
  } catch {
    /* 저장소 사용 불가 — 무시 */
  }
}

interface AuthState {
  member: Member | null
  isAuthenticated: boolean
  setAuth: (accessToken: string, member: Member) => void
  setMember: (member: Member) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  member: tokenStorage.get() ? loadMember() : null,
  isAuthenticated: !!tokenStorage.get(),
  setAuth: (accessToken, member) => {
    tokenStorage.set(accessToken)
    memberIdStorage.set(member.id)
    saveMember(member)
    set({ member, isAuthenticated: true })
  },
  setMember: (member) => {
    saveMember(member)
    set({ member })
  },
  clearAuth: () => {
    tokenStorage.clear()
    saveMember(null)
    set({ member: null, isAuthenticated: false })
  },
}))

// 토큰 재발급 실패 시(shared/lib/axios) 로그아웃 처리
window.addEventListener('auth:logout', () => useAuthStore.getState().clearAuth())
