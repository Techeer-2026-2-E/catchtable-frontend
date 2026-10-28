import { create } from 'zustand'
import type { TableType } from '@/entities'

/** 예약 단계(날짜·인원·시간 → 테이블 타입·메뉴 → 확정) 사이에서 유지되는 폼 상태 */
interface ReservationFormState {
  storeId: number | null
  date: string | null
  partySize: number
  time: string | null
  /** 선호 좌석 타입 — 실제 테이블은 시스템이 자동 배정 */
  tableType: TableType | null
  menuId: number | null
  /** 방문 목적 (복수 선택) */
  purposes: string[]
  request: string
  setStore: (storeId: number) => void
  setDate: (date: string) => void
  setPartySize: (size: number) => void
  setTime: (time: string) => void
  setTableType: (tableType: TableType) => void
  setMenu: (menuId: number | null) => void
  togglePurpose: (purpose: string) => void
  setRequest: (request: string) => void
  reset: () => void
}

const initialState = {
  storeId: null,
  date: null,
  partySize: 2,
  time: null,
  tableType: null,
  menuId: null,
  purposes: [] as string[],
  request: '',
}

export const useReservationFormStore = create<ReservationFormState>((set) => ({
  ...initialState,
  // 다른 매장으로 바뀔 때만 초기화 (같은 매장이면 선택 유지)
  setStore: (storeId) => set((s) => (s.storeId === storeId ? s : { ...initialState, storeId })),
  // 날짜·인원이 바뀌면 가능한 시간이 달라지므로 시간 선택 초기화
  setDate: (date) => set({ date, time: null }),
  setPartySize: (partySize) => set({ partySize, time: null }),
  setTime: (time) => set({ time }),
  setTableType: (tableType) => set({ tableType }),
  setMenu: (menuId) => set({ menuId }),
  togglePurpose: (purpose) =>
    set((s) => ({
      purposes: s.purposes.includes(purpose)
        ? s.purposes.filter((p) => p !== purpose)
        : [...s.purposes, purpose],
    })),
  setRequest: (request) => set({ request }),
  reset: () => set(initialState),
}))
