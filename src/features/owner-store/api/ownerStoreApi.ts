import type { BusinessHour, DayOfWeek, Menu, ReservationPolicy, StoreDetail, StoreTable, TableStatus } from '@/entities'
import { env } from '@/shared/config'
import { apiClient } from '@/shared/lib'

/* ---------- 요청 타입 (백엔드 dev DTO) ---------- */

/** StoreTableCreateRequest */
export interface CreateTableRequest {
  tableNumber: number
  minCapacity?: number
  capacity: number
}

/** StoreTableUpdateRequest — 운영 상태만 변경 가능 */
export interface UpdateTableRequest {
  status: TableStatus
}

/** BusinessHourRequest — 시간은 "HH:mm" 또는 "HH:mm:ss" */
export interface BusinessHourRequest {
  dayOfWeek: DayOfWeek
  openTime: string
  closingTime: string
  breakStartTime?: string | null
  breakEndTime?: string | null
}

/** MenuCreateRequest — 이름 100자, 설명 1000자 */
export interface CreateMenuRequest {
  name: string
  price: number
  description?: string
}
/** MenuUpdateRequest — 보낸 필드만 수정 */
export type UpdateMenuRequest = Partial<CreateMenuRequest>

export const ownerStoreApi = {
  /**
   * 내 매장 — 백엔드에 점주 매장 목록 API 가 없어서 VITE_OWNER_STORE_IDS 의 매장을
   * 고객용 상세 API(GET /api/user/stores/{id})로 조회 (임시)
   */
  getMyStores: () => Promise.all(env.ownerStoreIds.map(async (id) => (await apiClient.get<StoreDetail>(`/user/stores/${id}`)).data)),

  /* ---------- 테이블 ---------- */
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

  /* ---------- 영업시간 — 목록에 없는 요일은 휴무 ---------- */
  getBusinessHours: async (storeId: number) => {
    const { data } = await apiClient.get<BusinessHour[]>(`/owner/stores/${storeId}/business-hours`)
    return data
  },
  replaceBusinessHours: async (storeId: number, businessHours: BusinessHourRequest[]) => {
    const { data } = await apiClient.put<BusinessHour[]>(`/owner/stores/${storeId}/business-hours`, {
      businessHours,
    })
    return data
  },

  /* ---------- 예약 정책 ---------- */
  getReservationPolicy: async (storeId: number) => {
    const { data } = await apiClient.get<ReservationPolicy>(`/owner/stores/${storeId}/reservation-policy`)
    return data
  },
  replaceReservationPolicy: async (storeId: number, body: ReservationPolicy) => {
    const { data } = await apiClient.put<ReservationPolicy>(`/owner/stores/${storeId}/reservation-policy`, body)
    return data
  },

  /* ---------- 메뉴 — 조회 API 가 따로 없어서 매장 상세의 menus 를 사용 ---------- */
  getMenus: async (storeId: number) => {
    const { data } = await apiClient.get<StoreDetail>(`/user/stores/${storeId}`)
    return data.menus
  },
  createMenu: async (storeId: number, body: CreateMenuRequest) => {
    const { data } = await apiClient.post<Menu>(`/owner/stores/${storeId}/menus`, body)
    return data
  },
  updateMenu: async (storeId: number, menuId: number, body: UpdateMenuRequest) => {
    const { data } = await apiClient.patch<Menu>(`/owner/stores/${storeId}/menus/${menuId}`, body)
    return data
  },
}
