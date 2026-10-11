import type {
  BusinessHour,
  DayOfWeek,
  Menu,
  ReservationPolicy,
  SalesPeriod,
  SalesReport,
  Store,
  StoreCategory,
  StoreTable,
  TableStatus,
  TableType,
} from '@/entities'
import { apiClient } from '@/shared/lib'

/* ---------- 요청 타입 (백엔드 dev DTO) ---------- */

/** StoreTableCreateRequest */
export interface CreateTableRequest {
  tableNumber: number
  minCapacity?: number
  capacity: number
  /** [목 전용] */
  tableType?: TableType
}

/** StoreTableUpdateRequest — 바꿀 값만 */
export interface UpdateTableRequest {
  tableNumber?: number
  minCapacity?: number
  capacity?: number
  status?: TableStatus
  /** [목 전용] */
  tableType?: TableType
}

/** BusinessHourRequest — 시간은 "HH:mm" 또는 "HH:mm:ss" */
export interface BusinessHourRequest {
  dayOfWeek: DayOfWeek
  openTime: string
  closingTime: string
  breakStartTime?: string | null
  breakEndTime?: string | null
}

/** MenuCreateRequest */
export interface CreateMenuRequest {
  name: string
  price: number
  description?: string
  /** [목 전용] 이미지 업로드 API 확정 전까지 data URL */
  imageUrl?: string | null
  /** [목 전용] 판매 중지 */
  soldOut?: boolean
}
export type UpdateMenuRequest = Partial<CreateMenuRequest>

/** [노션 명세] 매장 등록·수정 */
export interface CreateStoreRequest {
  name: string
  category: StoreCategory
  address: string
  waitingAvailable: boolean
}
export type UpdateStoreRequest = Partial<CreateStoreRequest>

export const ownerStoreApi = {
  /* ---------- 매장 (노션 명세, 백엔드 미구현) ---------- */
  getMyStores: async () => {
    const { data } = await apiClient.get<Store[]>('/owner/stores')
    return data
  },
  createStore: async (body: CreateStoreRequest) => {
    const { data } = await apiClient.post<Store>('/owner/stores', body)
    return data
  },
  updateStore: async (storeId: number, body: UpdateStoreRequest) => {
    const { data } = await apiClient.patch<Store>(`/owner/stores/${storeId}`, body)
    return data
  },

  /* ---------- 테이블 (백엔드 dev 구현) ---------- */
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

  /* ---------- 영업시간 (백엔드 dev 구현) — 목록에 없는 요일은 휴무 ---------- */
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

  /* ---------- 예약 정책 (백엔드 dev 구현) ---------- */
  getReservationPolicy: async (storeId: number) => {
    const { data } = await apiClient.get<ReservationPolicy>(`/owner/stores/${storeId}/reservation-policy`)
    return data
  },
  replaceReservationPolicy: async (storeId: number, body: ReservationPolicy) => {
    const { data } = await apiClient.put<ReservationPolicy>(`/owner/stores/${storeId}/reservation-policy`, body)
    return data
  },

  /* ---------- P2: 메뉴 (등록·수정 백엔드 dev 구현, 삭제는 노션 명세) ---------- */
  /** 조회는 고객용 메뉴 API 를 같이 씀 */
  getMenus: async (storeId: number) => {
    const { data } = await apiClient.get<Menu[]>(`/user/stores/${storeId}/menus`)
    return data
  },
  createMenu: async (storeId: number, body: CreateMenuRequest) => {
    const { data } = await apiClient.post<Menu>(`/owner/stores/${storeId}/menus`, body)
    return data
  },
  updateMenu: async (storeId: number, menuId: number, body: UpdateMenuRequest) => {
    const { data } = await apiClient.patch<Menu>(`/owner/stores/${storeId}/menus/${menuId}`, body)
    return data
  },
  deleteMenu: async (storeId: number, menuId: number) => {
    await apiClient.delete(`/owner/stores/${storeId}/menus/${menuId}`)
  },

  /* ---------- P2: 매출 (노션 명세, 응답은 제안) ---------- */
  getSales: async (storeId: number, params: { period: SalesPeriod; date?: string }) => {
    const { data } = await apiClient.get<SalesReport>(`/owner/stores/${storeId}/sales`, { params })
    return data
  },
}
