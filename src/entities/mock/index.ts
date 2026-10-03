/**
 * 화면 개발용 목데이터 — API 연동 전까지 pages 에서 사용
 * TODO(API 연동): 각 feature 의 query 훅으로 교체한 뒤 이 슬라이스는 삭제
 */
import { dayjs } from '@/shared/lib/dayjs'
import type { Member } from '../member'
import type { Notification } from '../notification'
import type { Reservation } from '../reservation'
import type { BusinessHour, Menu, Store, StoreTable } from '../store'
import type { Waiting } from '../waiting'

const today = dayjs().format('YYYY-MM-DD')
const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD')

export const MOCK_MEMBER: Member = {
  id: 1,
  email: 'catch@example.com',
  name: '김캐치',
  phone: '01012345678',
  userType: 'CUSTOMER',
}

export const MOCK_OWNER: Member = {
  id: 2,
  email: 'owner@example.com',
  name: '박점주',
  phone: '01098765432',
  userType: 'OWNER',
}

export const MOCK_STORES: Store[] = [
  {
    id: 1,
    name: '마마카세',
    category: 'JAPANESE',
    address: '서울 강남구 학동로 123',
    region: '신사',
    waitingAvailable: false,
    rating: 4.8,
    reviewCount: 120,
    priceRange: '점심 1-3만원 · 저녁 8-15만원',
    maxPartySize: 7,
    depositAmount: 0,
  },
  {
    id: 2,
    name: '혼술 이자카야',
    category: 'BAR',
    address: '서울 강남구 강남대로 45',
    region: '강남',
    waitingAvailable: true,
    rating: 4.6,
    reviewCount: 88,
    priceRange: '저녁 2-3만원',
    maxPartySize: 6,
    depositAmount: 0,
    waitingTeams: 5,
  },
  {
    id: 3,
    name: '갓포토리',
    category: 'JAPANESE',
    address: '경기 수원시 팔달구 행궁로 7',
    region: '수원',
    waitingAvailable: false,
    rating: 4.9,
    reviewCount: 305,
    priceRange: '저녁 3-4만원',
    maxPartySize: 4,
    depositAmount: 10000,
  },
  {
    id: 4,
    name: '연남동 한상',
    category: 'KOREAN',
    address: '서울 마포구 연남로 12',
    region: '연남',
    waitingAvailable: true,
    rating: 4.5,
    reviewCount: 64,
    priceRange: '점심 1-2만원',
    maxPartySize: 8,
    depositAmount: 0,
    waitingTeams: 2,
  },
  {
    id: 5,
    name: '북극오마카세 아카사카',
    category: 'JAPANESE',
    address: '서울 강남구 선릉로 88',
    region: '강남',
    waitingAvailable: false,
    rating: 4.8,
    reviewCount: 120,
    priceRange: '저녁 8-15만원',
    maxPartySize: 7,
    depositAmount: 0,
  },
  {
    id: 6,
    name: '브런치 하우스',
    category: 'CAFE',
    address: '서울 성동구 성수이로 20',
    region: '성수',
    waitingAvailable: true,
    rating: 4.3,
    reviewCount: 212,
    priceRange: '1-2만원',
    maxPartySize: 6,
    depositAmount: 0,
    waitingTeams: 11,
  },
]

export const MOCK_MENUS: Menu[] = [
  { id: 1, name: '오마카세 A코스', price: 120000, description: '제철 스시 12피스 + 디저트' },
  { id: 2, name: '오마카세 B코스', price: 85000, description: '스시 10피스 + 우동' },
  { id: 3, name: '런치 코스', price: 45000, description: '스시 8피스' },
]

export const MOCK_TABLES: StoreTable[] = [
  { id: 1, tableNumber: 1, capacity: 4, minCapacity: 2, status: 'ACTIVE', tableType: 'ROOM' },
  { id: 2, tableNumber: 2, capacity: 4, minCapacity: 2, status: 'ACTIVE', tableType: 'ROOM' },
  { id: 3, tableNumber: 3, capacity: 2, minCapacity: 2, status: 'ACTIVE', tableType: 'HALL' },
  { id: 4, tableNumber: 4, capacity: 6, minCapacity: 2, status: 'ACTIVE', tableType: 'HALL' },
  { id: 5, tableNumber: 5, capacity: 2, minCapacity: 1, status: 'ACTIVE', tableType: 'BAR' },
  { id: 6, tableNumber: 6, capacity: 2, minCapacity: 1, status: 'INACTIVE', tableType: 'BAR' },
]

export const MOCK_BUSINESS_HOURS: BusinessHour[] = [
  { dayOfWeek: 1, openTime: '11:30', closeTime: '22:00', closed: false },
  { dayOfWeek: 2, openTime: '11:30', closeTime: '22:00', closed: false },
  { dayOfWeek: 3, openTime: '11:30', closeTime: '22:00', closed: false },
  { dayOfWeek: 4, openTime: '11:30', closeTime: '22:00', closed: false },
  { dayOfWeek: 5, openTime: '11:30', closeTime: '02:00', closed: false },
  { dayOfWeek: 6, openTime: '11:30', closeTime: '02:00', closed: false },
  { dayOfWeek: 0, openTime: '11:30', closeTime: '22:00', closed: true },
]

/** 예약 가능 시간 슬롯 (30분 단위) */
export const MOCK_TIME_SLOTS = [
  { time: '17:00', available: true, remainingTables: 3 },
  { time: '17:30', available: true, remainingTables: 2 },
  { time: '18:00', available: true, remainingTables: 1 },
  { time: '18:30', available: false, remainingTables: 0 },
  { time: '19:00', available: true, remainingTables: 2 },
  { time: '19:30', available: true, remainingTables: 4 },
  { time: '20:00', available: true, remainingTables: 4 },
  { time: '20:30', available: false, remainingTables: 0 },
]

export const MOCK_RESERVATIONS: Reservation[] = [
  {
    id: 101,
    storeId: 1,
    storeName: '마마카세',
    date: tomorrow,
    time: '18:00',
    partySize: 2,
    status: 'CONFIRMED',
    tableTypeLabel: '룸',
    createdAt: dayjs().subtract(1, 'day').toISOString(),
  },
  {
    id: 102,
    storeId: 4,
    storeName: '연남동 한상',
    date: dayjs().subtract(5, 'day').format('YYYY-MM-DD'),
    time: '19:00',
    partySize: 4,
    status: 'COMPLETED',
    tableTypeLabel: '홀',
    createdAt: dayjs().subtract(9, 'day').toISOString(),
  },
  {
    id: 103,
    storeId: 3,
    storeName: '갓포토리',
    date: dayjs().subtract(12, 'day').format('YYYY-MM-DD'),
    time: '18:30',
    partySize: 2,
    status: 'CANCELED',
    tableTypeLabel: '바',
    createdAt: dayjs().subtract(15, 'day').toISOString(),
  },
]

export const MOCK_WAITINGS: Waiting[] = [
  {
    id: 201,
    storeId: 2,
    storeName: '혼술 이자카야',
    waitingNumber: 12,
    partySize: 2,
    status: 'WAITING',
    teamsAhead: 1,
    seatPreference: '테이블석',
    createdAt: dayjs().hour(18).minute(20).toISOString(),
  },
]

/** 점주 — 오늘 예약 현황 (지금 시각 기준으로 만들어 언제 열어도 상태 흐름을 볼 수 있게 함) */
const at = (minutesFromNow: number) => {
  const raw = dayjs().add(minutesFromNow, 'minute')
  const d = raw.minute(Math.floor(raw.minute() / 30) * 30) // 30분 단위로 내림
  return { date: d.format('YYYY-MM-DD'), time: d.format('HH:mm') }
}
const ownerReservation = (id: number, minutes: number, rest: Pick<Reservation, 'partySize' | 'status' | 'customerName' | 'tableTypeLabel'>): Reservation => ({
  id,
  storeId: 2,
  storeName: '혼술 이자카야',
  createdAt: today,
  ...at(minutes),
  ...rest,
})
export const MOCK_OWNER_RESERVATIONS: Reservation[] = [
  ownerReservation(301, -60, { partySize: 2, status: 'VISITED', customerName: '이하은', tableTypeLabel: '룸' }),
  ownerReservation(302, -30, { partySize: 2, status: 'CONFIRMED', customerName: '김민지', tableTypeLabel: '룸' }),
  ownerReservation(303, 30, { partySize: 4, status: 'CONFIRMED', customerName: '박서준', tableTypeLabel: '바' }),
  ownerReservation(304, -240, { partySize: 3, status: 'VISITED', customerName: '최유진', tableTypeLabel: '홀' }),
  ownerReservation(305, -180, { partySize: 2, status: 'NO_SHOW', customerName: '정하늘', tableTypeLabel: '홀' }),
]

/** 점주 — 현재 웨이팅 */
export const MOCK_OWNER_WAITINGS: Waiting[] = [
  { id: 401, storeId: 2, storeName: '혼술 이자카야', waitingNumber: 1, partySize: 2, status: 'CALLED', customerName: '정우성', createdAt: dayjs().hour(18).minute(5).toISOString(), calledAt: dayjs().subtract(2, 'minute').toISOString() },
  { id: 402, storeId: 2, storeName: '혼술 이자카야', waitingNumber: 2, partySize: 4, status: 'WAITING', customerName: '한소희', createdAt: dayjs().hour(18).minute(10).toISOString() },
  { id: 403, storeId: 2, storeName: '혼술 이자카야', waitingNumber: 3, partySize: 2, status: 'WAITING', customerName: '유재석', createdAt: dayjs().hour(18).minute(20).toISOString() },
]

export const MOCK_NOTIFICATIONS: Notification[] = [
  { id: 1, type: 'WAITING_CALLED', title: '입장 가능합니다!', content: '혼술 이자카야 웨이팅 · 10분 내 도착 의사를 확인해주세요', read: false, createdAt: dayjs().subtract(1, 'minute').toISOString(), link: '/waitings/201' },
  { id: 2, type: 'RESERVATION_CONFIRMED', title: '예약이 확정됐어요', content: `마마카세 · ${dayjs(tomorrow).format('M/D(dd)')} 18:00 · 2명`, read: false, createdAt: dayjs().subtract(1, 'hour').toISOString(), link: '/reservations/101' },
  { id: 3, type: 'WAITING_POSITION', title: '대기순번이 앞당겨졌어요', content: '혼술 이자카야 · 현재 1번째 대기 중', read: true, createdAt: dayjs().subtract(3, 'hour').toISOString(), link: '/waitings/201' },
  { id: 4, type: 'REVIEW_REQUEST', title: '리뷰를 남겨보세요', content: '연남동 한상 방문은 어떠셨나요?', read: true, createdAt: dayjs().subtract(1, 'day').toISOString() },
]

export const findMockStore = (storeId: number | string | undefined) =>
  MOCK_STORES.find((s) => s.id === Number(storeId)) ?? MOCK_STORES[0]
