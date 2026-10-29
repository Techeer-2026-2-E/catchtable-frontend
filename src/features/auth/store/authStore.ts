import { create } from 'zustand'
import type { Member } from '@/entities'
import { memberIdStorage } from '@/shared/lib'

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
  setMember: (member: Member) => void
  clearAuth: () => void
}

const initial = memberIdStorage.get() ? loadMember() : null

export const useAuthStore = create<AuthState>((set) => ({
  member: initial,
  isAuthenticated: !!initial,
  setMember: (member) => {
    memberIdStorage.set(member.id)
    saveMember(member)
    set({ member, isAuthenticated: true })
  },
  clearAuth: () => {
    memberIdStorage.clear()
    saveMember(null)
    set({ member: null, isAuthenticated: false })
  },
}))
