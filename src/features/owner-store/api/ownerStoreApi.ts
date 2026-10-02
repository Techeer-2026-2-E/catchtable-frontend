import type { BusinessHour, Store, StoreCategory, StoreDetail, StoreTable, TableStatus } from '@/entities'
import { apiClient } from '@/shared/lib'

export interface CreateStoreRequest {
  name: string
  category: StoreCategory
  address: string
  waitingAvailable: boolean
  reservationDurationMinutes: number
  reservationSlotMinutes: number
  arrivalGraceMinutes: number
}

export type UpdateStoreRequest = Partial<CreateStoreRequest>

/** 백엔드 store.dto.StoreTableCreateRequest */
export interface CreateTableRequest {
  tableNumber: number
  capacity: number
}

/** 백엔드 store.dto.StoreTableUpdateRequest */
export interface UpdateTableRequest {
  tableNumber?: number
  capacity?: number
  status?: TableStatus
}

/** 예약 정책 — 필드는 백엔드 확정 후 수정 */
export interface ReservationPolicy {
  reservationDurationMinutes: number
  reservationSlotMinutes: number
  arrivalGraceMinutes: number
}

export const ownerStoreApi = {
  /* ---------- 매장 관리 ---------- */
  getMyStores: async () => {
    const { data } = await apiClient.get<Store[]>('/owner/stores')
    return data
  },
  createStore: async (body: CreateStoreRequest) => {
    const { data } = await apiClient.post<StoreDetail>('/owner/stores', body)
    return data
  },
  updateStore: async (storeId: number, body: UpdateStoreRequest) => {
    const { data } = await apiClient.patch<StoreDetail>(`/owner/stores/${storeId}`, body)
    return data
  },
  /** 영업시간·휴무일 설정 */
  updateBusinessHours: async (storeId: number, body: BusinessHour[]) => {
    await apiClient.put(`/owner/stores/${storeId}/business-hours`, body)
  },
  /** 예약 정책 설정 */
  updateReservationPolicy: async (storeId: number, body: ReservationPolicy) => {
    await apiClient.put(`/owner/stores/${storeId}/reservation-policy`, body)
  },

  /* ---------- 좌석 설정 (백엔드 OwnerStoreTableController 구현됨) ---------- */
  getTables: async (storeId: number) => {
    const { data } = await apiClient.get<StoreTable[]>(`/owner/stores/${storeId}/tables`)
    return data
  },
  createTable: async (storeId: number, body: CreateTableRequest) => {
    const { data } = await apiClient.post<StoreTable>(`/owner/stores/${storeId}/tables`, body)
    return data
  },
  updateTable: async (storeId: number, tableId: number, body: UpdateTableRequest) => {
    const { data } = await apiClient.patch<StoreTable>(`/owner/stores/${storeId}/tables/${tableId}`, body)
    return data
  },

  // P2: 메뉴(/menus), 매출(/sales), 운영 통계(/statistics), 리뷰(/reviews)
}
