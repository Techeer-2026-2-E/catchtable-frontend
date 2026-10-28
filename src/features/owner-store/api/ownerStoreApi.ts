import type {
  BusinessHour,
  DayOfWeek,
  Menu,
  ReservationPolicy,
  SalesPeriod,
  SalesReport,
  Store,
  StoreCategory,
  StoreDetail,
  StoreReview,
  StoreReviewList,
  StoreTable,
  TableStatus,
  TableType,
} from '@/entities'
import { env, isFeatureAvailable } from '@/shared/config'
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

/** [노션 명세] 매장 등록 — 백엔드 미구현 */
export interface CreateStoreRequest {
  name: string
  category: StoreCategory
  address: string
  waitingAvailable: boolean
}

/** 매장 기본 정보 수정 — StoreInfoUpdateRequest (보낸 필드만 수정) */
export interface UpdateStoreRequest {
  name?: string
  category?: StoreCategory
  address?: string
  description?: string
  /** 0X-XXXX-XXXX 또는 "" */
  phone?: string
  /** http(s) URL 또는 "" */
  imageUrl?: string
}

export const ownerStoreApi = {
  /* ---------- 매장 ---------- */
  /**
   * [노션 명세] 내 매장 목록 — 백엔드 미구현
   * 실제 백엔드 연동 중에는 VITE_OWNER_STORE_IDS 의 매장을 고객용 상세 API 로 대신 조회 (임시)
   */
  getMyStores: async (): Promise<Store[]> => {
    if (!isFeatureAvailable('ownerStoreList')) {
      return Promise.all(
        env.ownerStoreIds.map(async (id) => (await apiClient.get<StoreDetail>(`/user/stores/${id}`)).data),
      )
    }
    const { data } = await apiClient.get<Store[]>('/owner/stores')
    return data
  },
  createStore: async (body: CreateStoreRequest) => {
    const { data } = await apiClient.post<Store>('/owner/stores', body)
    return data
  },
  /** 매장 기본 정보 수정 — 백엔드 dev 구현, StoreInfoResponse 반환 */
  updateStore: async (storeId: number, body: UpdateStoreRequest) => {
    const { data } = await apiClient.patch<StoreDetail>(`/owner/stores/${storeId}`, body)
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

  /* ---------- 메뉴 (등록·수정 백엔드 dev 구현, 삭제는 노션 명세·미구현) ---------- */
  /** 조회 API 가 따로 없어서 매장 상세의 menus 를 사용 */
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
  /** [노션 명세] 메뉴 삭제 — 백엔드 미구현 */
  deleteMenu: async (storeId: number, menuId: number) => {
    await apiClient.delete(`/owner/stores/${storeId}/menus/${menuId}`)
  },

  /* ---------- P2: 매출 (노션 명세, 응답은 제안) ---------- */
  /* ---------- P2: 리뷰 관리 (노션 명세·백엔드 미구현, 답글 삭제는 경로 제안) ---------- */
  /** 점주 리뷰 목록 — 백엔드에 없으면 고객용 매장 리뷰(최근 50개, 답글 없음)로 대신 조회 */
  getReviews: async (storeId: number): Promise<StoreReview[]> => {
    if (!isFeatureAvailable('ownerReviews')) {
      const { data } = await apiClient.get<StoreReviewList>(`/user/stores/${storeId}/reviews`, { params: { size: 50 } })
      return data.reviews
    }
    const { data } = await apiClient.get<StoreReview[]>(`/owner/stores/${storeId}/reviews`)
    return data
  },
  /** 답글 작성·수정 — 이미 있으면 덮어씀 */
  replyReview: async (reviewId: number, content: string) => {
    const { data } = await apiClient.post<StoreReview>(`/user/reviews/${reviewId}/reply`, { content })
    return data
  },
  deleteReply: async (reviewId: number) => {
    const { data } = await apiClient.delete<StoreReview>(`/user/reviews/${reviewId}/reply`)
    return data
  },

  getSales: async (storeId: number, params: { period: SalesPeriod; date?: string }) => {
    const { data } = await apiClient.get<SalesReport>(`/owner/stores/${storeId}/sales`, { params })
    return data
  },
}
