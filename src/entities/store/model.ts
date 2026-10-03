/** 백엔드 store.entity.StoreCategory */
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

export interface Store {
  id: number
  name: string
  category: StoreCategory
  address: string
  waitingAvailable: boolean
  thumbnailUrl?: string
  /* ----- 아래는 화면(와이어프레임)에서 쓰는 값 — 백엔드 응답 확정 후 맞춰서 수정 ----- */
  /** 지역 (예: 강남) */
  region?: string
  rating?: number
  reviewCount?: number
  /** 가격대 안내 (예: 저녁 8-15만원) */
  priceRange?: string
  /** 최대 예약 인원 */
  maxPartySize?: number
  /** 1인 예약금(원) — 0이면 예약금 없음 */
  depositAmount?: number
  /** 현재 웨이팅 팀 수 */
  waitingTeams?: number
}

export interface StoreDetail extends Store {
  /** 1회 예약 이용 시간(분) */
  reservationDurationMinutes: number
  /** 예약 시간 단위(분) */
  reservationSlotMinutes: number
  /** 호출·예약 도착 유예 시간(분) */
  arrivalGraceMinutes: number
}

/** 백엔드 store.entity.TableStatus */
export type TableStatus = 'ACTIVE' | 'INACTIVE'

/** 좌석(공간) 타입 — 백엔드 확정 필요 */
export type TableType = 'ROOM' | 'HALL' | 'BAR'

export const TABLE_TYPE_LABEL: Record<TableType, string> = {
  ROOM: '룸',
  HALL: '홀',
  BAR: '바',
}

/** 백엔드 store.dto.StoreTableResponse */
export interface StoreTable {
  id: number
  tableNumber: number
  capacity: number
  status: TableStatus
  /** 최소 수용 인원 — 백엔드 확정 필요 */
  minCapacity?: number
  tableType?: TableType
}

export interface Menu {
  id: number
  name: string
  price: number
  description?: string
  imageUrl?: string
}

/** 예약 가능 시간·잔여 테이블 (/stores/{storeId}/availability) */
export interface AvailabilitySlot {
  /** HH:mm */
  time: string
  available: boolean
  remainingTables: number
}

export interface BusinessHour {
  /** 0(일) ~ 6(토) */
  dayOfWeek: number
  openTime: string
  closeTime: string
  closed: boolean
}
