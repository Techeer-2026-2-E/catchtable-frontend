import type {
  BusinessHour,
  DayOfWeek,
  DepositPolicy,
  Menu,
  RefundPolicy,
  SalesSummary,
  ReservationPolicy,
  SpecialBusinessDay,
  StoreCategory,
  StoreDetail,
  StoreTable,
  TableStatus,
} from '@/entities'
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

/** StoreInfoUpdateRequest — 전화번호 "0X-XXXX-XXXX", 이미지는 http(s) 주소 (빈 문자열이면 삭제) */
export interface StoreInfoUpdateRequest {
  name: string
  category: StoreCategory
  address: string
  description: string
  phone: string
  imageUrl: string
}

/** StoreInfoResponse */
export interface StoreInfo {
  id: number
  name: string
  category: StoreCategory
  categoryName: string
  address: string
  description: string | null
  phone: string | null
  imageUrl: string | null
}

/** SpecialBusinessDayRequest — 휴무면 시간은 모두 null */
export type SpecialBusinessDayRequest = Omit<SpecialBusinessDay, 'businessDate'>

/** DepositPolicyRequest — 예약금을 받지 않으면 금액 0, 환불 정책 null */
export interface DepositPolicyRequest {
  depositEnabled: boolean
  depositAmount: number
  refundPolicy: RefundPolicy | null
}

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

  /* ---------- 매장 정보 — 조회 API 가 없어서 초기값은 매장 상세를 사용 ---------- */
  updateStoreInfo: async (storeId: number, body: StoreInfoUpdateRequest) => {
    const { data } = await apiClient.patch<StoreInfo>(`/owner/stores/${storeId}`, body)
    return data
  },

  /* ---------- 특정일 휴무, 영업 변경 ---------- */
  getSpecialDays: async (storeId: number) => {
    const { data } = await apiClient.get<SpecialBusinessDay[]>(`/owner/stores/${storeId}/special-business-days`)
    return data
  },
  putSpecialDay: async (storeId: number, date: string, body: SpecialBusinessDayRequest) => {
    const { data } = await apiClient.put<SpecialBusinessDay>(`/owner/stores/${storeId}/special-business-days/${date}`, body)
    return data
  },
  deleteSpecialDay: async (storeId: number, date: string) => {
    await apiClient.delete(`/owner/stores/${storeId}/special-business-days/${date}`)
  },

  /* ---------- 예약금 정책 ---------- */
  getDepositPolicy: async (storeId: number) => {
    const { data } = await apiClient.get<DepositPolicy>(`/owner/stores/${storeId}/deposit-policy`)
    return data
  },
  replaceDepositPolicy: async (storeId: number, body: DepositPolicyRequest) => {
    const { data } = await apiClient.put<DepositPolicy>(`/owner/stores/${storeId}/deposit-policy`, body)
    return data
  },
  /** 기간 매출 — from, to 는 yyyy-MM-dd (서울 시간, 양 끝 포함) */
  getSales: async (storeId: number, from: string, to: string) => {
    const { data } = await apiClient.get<SalesSummary>(`/owner/stores/${storeId}/sales`, { params: { from, to } })
    return data
  },
}
