import { create } from 'zustand'

/** 예약 단계(날짜 → 인원 → 시간 → 확정) 사이에서 유지되는 폼 상태 */
interface ReservationFormState {
  storeId: number | null
  date: string | null
  partySize: number
  time: string | null
  setStore: (storeId: number) => void
  setDate: (date: string) => void
  setPartySize: (size: number) => void
  setTime: (time: string) => void
  reset: () => void
}

const initialState = {
  storeId: null,
  date: null,
  partySize: 2,
  time: null,
}

export const useReservationFormStore = create<ReservationFormState>((set) => ({
  ...initialState,
  setStore: (storeId) => set({ ...initialState, storeId }),
  // 날짜·인원이 바뀌면 가능한 시간이 달라지므로 시간 선택 초기화
  setDate: (date) => set({ date, time: null }),
  setPartySize: (partySize) => set({ partySize, time: null }),
  setTime: (time) => set({ time }),
  reset: () => set(initialState),
}))
