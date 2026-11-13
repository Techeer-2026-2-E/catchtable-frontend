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
  /** 대표 사진 1장 (http(s) URL). 없으면 null */
  imageUrl: string | null
  /*
   * 아래는 검색 목록(StoreSummaryResponse)이 지도 목록과 같은 규칙으로 함께 주는 값
   * 예전 서버 응답에는 없을 수 있어 선택 필드로 둔다
   */
  /** 주소의 구 이름 ("강남구"). 형식이 다르면 null */
  area?: string | null
  latitude?: number | null
  longitude?: number | null
  /** 점주가 있는 입점 매장만 true */
  reservationEnabled?: boolean
  openStatus?: OpenStatus | null
  /** 다음에 영업 상태가 바뀌는 한국 시각 (LocalDateTime) */
  nextChangeAt?: string | null
  /** 소수 첫째 자리, 리뷰가 없으면 null */
  ratingAverage?: number | null
  reviewCount?: number
}

/** GET /api/user/stores — StoreListResponse */
export interface StoreList {
  stores: Store[]
  page: number
  size: number
  hasNext: boolean
}

/** GET /api/user/stores/{storeId} — StoreDetailResponse (메뉴 포함) */
export interface StoreDetail extends Store {
  /** 예약 지원 여부. 잔여 테이블 수와는 별개다. */
  reservationEnabled: boolean
  description: string | null
  /** 0X-XXXX-XXXX */
  phone: string | null
  businessHours: BusinessHour[]
  /** 매장 메뉴 — 백엔드는 별도 메뉴 조회 API 없이 상세에 포함 */
  menus: Menu[]
  /** 위도·경도 (WGS84). 좌표가 없는 매장은 null, 필드가 없는 예전 서버 응답이면 undefined */
  latitude?: number | null
  longitude?: number | null
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

/** 특정일 휴무·예외 영업시간 — SpecialBusinessDayResponse (시간은 "HH:mm:ss", 휴무면 null) */
export interface SpecialBusinessDay {
  /** YYYY-MM-DD */
  businessDate: string
  closed: boolean
  openTime: string | null
  closingTime: string | null
  breakStartTime: string | null
  breakEndTime: string | null
}

/** 예약금 환불 정책 — store.entity.RefundPolicy */
export type RefundPolicy = 'FLEXIBLE' | 'STANDARD' | 'STRICT'

export const REFUND_POLICY_LABEL: Record<RefundPolicy, string> = {
  FLEXIBLE: '유연',
  STANDARD: '일반',
  STRICT: '엄격',
}

/** 환불 비율 안내 — 백엔드 ReservationRefundCalculator 기준 (방문일까지 남은 날 기준) */
export const REFUND_POLICY_RULES: Record<RefundPolicy, [string, string][]> = {
  FLEXIBLE: [
    ['방문 1일 전까지', '전액 환불'],
    ['방문 당일', '50% 환불'],
  ],
  STANDARD: [
    ['방문 2일 전까지', '전액 환불'],
    ['방문 1일 전', '50% 환불'],
    ['방문 당일, 노쇼', '환불 없음'],
  ],
  STRICT: [
    ['방문 3일 전까지', '전액 환불'],
    ['방문 2일 전', '50% 환불'],
    ['방문 1일 전', '20% 환불'],
    ['방문 당일, 노쇼', '환불 없음'],
  ],
}

/** 예약금 정책 — DepositPolicyResponse (예약 1건당 금액) */
export interface DepositPolicy {
  depositEnabled: boolean
  depositAmount: number
  refundPolicy: RefundPolicy | null
}

/* ---------- 지도 검색 — 백엔드 feat/266-map-stores ---------- */

/** 위도, 경도 (WGS84) */
export interface LatLng {
  lat: number
  lng: number
}

/** 지도 화면 사각형 — 남서, 북동 모서리 */
export interface MapBounds {
  swLat: number
  swLng: number
  neLat: number
  neLng: number
}

/** 지금 시각 기준 영업 상태 — 영업시간 정보가 없는 매장은 null */
export type OpenStatus = 'OPEN' | 'BREAK' | 'BEFORE_OPEN' | 'CLOSED'

export const OPEN_STATUS_LABEL: Record<OpenStatus, string> = {
  OPEN: '영업 중',
  BREAK: '브레이크타임',
  BEFORE_OPEN: '영업 전',
  CLOSED: '영업 종료',
}

/** 지도 매장 목록 한 건 — MapStoreResponse */
export interface MapStore {
  id: number
  name: string
  categoryName: string
  imageUrl: string | null
  latitude: number
  longitude: number
  /** 주소의 구 이름 ("강남구"). 형식이 다르면 null */
  area: string | null
  /** 현재 위치를 보낸 조회에서만 값이 있음 */
  distanceMeters: number | null
  /** 점주가 있는 입점 매장만 true */
  reservationEnabled: boolean
  waitingAvailable: boolean
  openStatus: OpenStatus | null
  /** 다음에 영업 상태가 바뀌는 한국 시각 (LocalDateTime) */
  nextChangeAt: string | null
  /** 소수 첫째 자리, 리뷰가 없으면 null */
  ratingAverage: number | null
  reviewCount: number
}

/** GET /api/user/stores/map/radius · /map/bounds — MapStoreListResponse */
export interface MapStoreList {
  stores: MapStore[]
  page: number
  size: number
  hasNext: boolean
}

/** 지도 핀 하나 — MapMarkerResponse */
export interface MapMarker {
  id: number
  name: string
  latitude: number
  longitude: number
}

/** GET /api/user/stores/map/bounds/markers — truncated 면 화면 안 매장이 상한(1000)보다 많아 일부만 옴 */
export interface MapMarkerList {
  stores: MapMarker[]
  truncated: boolean
}

/* ---------- 매출 — 기능32 GET /api/owner/stores/{storeId}/sales?from=&to= ---------- */

/**
 * 기간 매출 (SalesResponse) — 승인 시각이 기간 안인 성공 결제 기준, 서울 시간
 * 환불액은 같은 결제들의 현재 누적 환불액이라 나중에 환불되면 지난 기간 값도 바뀜
 */
export interface SalesSummary {
  from: string
  to: string
  approvedAmount: number
  refundedAmount: number
  /** approvedAmount - refundedAmount */
  netAmount: number
  /** 테스트 결제 기반 모의 집계 안내 — 그대로 보여줌 */
  notice: string
}
