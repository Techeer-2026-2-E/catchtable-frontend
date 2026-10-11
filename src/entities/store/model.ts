/*
 * 매장 도메인 타입 — 백엔드 dev 의 store DTO 와 필드명을 그대로 맞춤
 * (catchtable-backend: store/dto/*Response.java)
 *
 * [목 전용] 표시가 붙은 필드는 아직 백엔드 응답에 없고 화면(와이어프레임)에만 필요한 값.
 * 목 API 가 내려주며, 백엔드에 추가 요청할 목록이기도 함.
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
  /* ----- [목 전용] 백엔드 응답에 추가 요청 필요 ----- */
  thumbnailUrl?: string
  /** 지역 (예: 강남) */
  region?: string
  rating?: number
  reviewCount?: number
  /** 가격대 안내 (예: 저녁 8-15만원) */
  priceRange?: string
  /** 최대 예약 인원 */
  maxPartySize?: number
  /** 1인 예약금(원) — 0이면 예약금 없음 (P2) */
  depositAmount?: number
  /** 현재 웨이팅 팀 수 */
  waitingTeams?: number
  /** 위치 (P2 지도·주변 매장) */
  latitude?: number
  longitude?: number
  /** 주변 매장 조회 시 현재 위치로부터 거리(m) */
  distanceMeters?: number
}

/** GET /api/user/stores/{storeId} — StoreDetailResponse */
export interface StoreDetail extends Store {
  businessHours: BusinessHour[]
}

/** store.entity.TableStatus */
export type TableStatus = 'ACTIVE' | 'INACTIVE'

/** [목 전용] 좌석(공간) 타입 — 백엔드 StoreTable 에 아직 없음 */
export type TableType = 'ROOM' | 'HALL' | 'BAR'

export const TABLE_TYPE_LABEL: Record<TableType, string> = {
  ROOM: '룸',
  HALL: '홀',
  BAR: '바',
}

/** StoreTableResponse */
export interface StoreTable {
  id: number
  tableNumber: number
  minCapacity: number
  capacity: number
  status: TableStatus
  /** [목 전용] */
  tableType?: TableType
}

/** MenuResponse */
export interface Menu {
  id: number
  name: string
  price: number
  description: string | null
  /** [목 전용] */
  imageUrl?: string
  /** [목 전용] 품절·판매 중지 — 고객 예약 화면에서 선택 불가 */
  soldOut?: boolean
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

/* ---------- P2: 매출 관리 — GET /api/owner/stores/{storeId}/sales (응답 필드는 제안) ---------- */

export type SalesPeriod = 'DAY' | 'WEEK' | 'MONTH'

export interface SalesPoint {
  /** 구간 라벨 (예: 10/3, 40주차, 10월) */
  label: string
  /** 구간 시작일 YYYY-MM-DD */
  date: string
  amount: number
  reservationCount: number
  waitingCount: number
}

export interface SalesReport {
  storeId: number
  period: SalesPeriod
  /** 조회 구간 합계 */
  totalAmount: number
  reservationCount: number
  waitingCount: number
  /** 직전 같은 구간 대비 증감률(%) */
  changeRate: number
  points: SalesPoint[]
}
