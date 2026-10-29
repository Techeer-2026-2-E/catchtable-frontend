/*
 * 매장 도메인 타입 — 백엔드 dev 의 store DTO 와 필드명을 그대로 맞춤
 * (catchtable-backend: store/dto/*Response.java)
 */

/** store.entity.StoreCategory */
export type StoreCategory = 'KOREAN' | 'JAPANESE' | 'CHINESE' | 'WESTERN' | 'CAFE' | 'BAR' | 'ETC'

export const STORE_CATEGORY_LABEL: Record<StoreCategory, string> = {
  KOREAN: '한식',
  JAPANESE: '일식',
  CHINESE: '중식',
  WESTERN: '양식',
  CAFE: '카페',
  BAR: '주점',
  ETC: '기타',
}

/** GET /api/user/categories — CategoryResponse */
export interface Category {
  code: StoreCategory
  name: string
}

/** java.time.DayOfWeek */
export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'

/** 월요일부터 표시 순서 */
export const DAYS_OF_WEEK: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']

export const DAY_OF_WEEK_LABEL: Record<DayOfWeek, string> = {
  MONDAY: '월',
  TUESDAY: '화',
  WEDNESDAY: '수',
  THURSDAY: '목',
  FRIDAY: '금',
  SATURDAY: '토',
  SUNDAY: '일',
}

/** dayjs().day() (0=일) → DayOfWeek */
export const toDayOfWeek = (jsDay: number): DayOfWeek =>
  (['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const)[jsDay]

/**
 * BusinessHourResponse — 시간은 "HH:mm:ss" (LocalTime)
 * 목록에 없는 요일은 휴무. closingTime 이 openTime 보다 이르면 다음날 마감
 */
export interface BusinessHour {
  dayOfWeek: DayOfWeek
  openTime: string
  closingTime: string
  breakStartTime: string | null
  breakEndTime: string | null
}

/** GET /api/user/stores — StoreSummaryResponse */
export interface Store {
  id: number
  name: string
  category: StoreCategory
  categoryName: string
  address: string
  waitingAvailable: boolean
}

/** GET /api/user/stores/{storeId} — StoreDetailResponse (메뉴 포함) */
export interface StoreDetail extends Store {
  description: string | null
  /** 0X-XXXX-XXXX */
  phone: string | null
  imageUrl: string | null
  businessHours: BusinessHour[]
  /** 매장 메뉴 — 백엔드는 별도 메뉴 조회 API 없이 상세에 포함 */
  menus: Menu[]
}

/** store.entity.TableStatus */
export type TableStatus = 'ACTIVE' | 'INACTIVE'

/** StoreTableResponse */
export interface StoreTable {
  id: number
  tableNumber: number
  minCapacity: number
  capacity: number
  status: TableStatus
}

/** MenuResponse */
export interface Menu {
  id: number
  name: string
  price: number
  description: string | null
}

/** GET /api/user/stores/{storeId}/availability — AvailabilityResponse */
export interface Availability {
  storeId: number
  /** YYYY-MM-DD */
  date: string
  partySize: number
  slots: AvailabilitySlot[]
}

export interface AvailabilitySlot {
  /** ISO OffsetDateTime (예: 2026-10-03T18:00:00+09:00) */
  reservationStartAt: string
  availableTableCount: number
  available: boolean
}

/** ReservationPolicyResponse */
export interface ReservationPolicy {
  /** 1회 이용 시간(분) */
  reservationDurationMinutes: number
  /** 예약 시간 단위(분) */
  reservationSlotMinutes: number
  /** 도착 유예 시간(분) — 지나면 노쇼 처리 가능 */
  arrivalGraceMinutes: number
  /** 오늘부터 며칠 뒤까지 예약 가능 */
  bookingOpenDays: number
  /** 시작 몇 분 전에 예약 마감 */
  bookingDeadlineMinutes: number
}
