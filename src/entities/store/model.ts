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

/** 백엔드 store.dto.StoreTableResponse */
export interface StoreTable {
  id: number
  tableNumber: number
  capacity: number
  status: TableStatus
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
