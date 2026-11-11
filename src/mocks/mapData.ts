import type { BusinessHour, DayOfWeek, StoreCategory } from '@/entities'
import type { StoreRow } from './db'

/**
 * 지도 검색용 목 데이터
 * - 시드 매장(1~8)의 좌표: 주소 근처의 대략적인 값
 * - 공공데이터 매장: 점주가 없는(예약 불가) 매장. 실제 백엔드에는 공공데이터로 수천 개가 들어 있어서
 *   지도 핀이 촘촘한 화면을 확인하려고 강남역 주변에 몇 개 둔다. 홈, 검색 목록에는 넣지 않는다
 */
export const SEED_STORE_COORDS: Record<number, [lat: number, lng: number]> = {
  1: [37.5146, 127.0336],
  2: [37.4986, 127.0281],
  3: [37.2821, 127.0136],
  4: [37.5601, 126.9231],
  5: [37.5021, 127.0489],
  6: [37.5411, 127.0561],
  7: [37.5661, 126.9911],
  8: [37.5346, 126.9941],
}

const DAYS: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
const hours = (open: string, close: string, closed: DayOfWeek[] = [], breakTime?: [string, string]): BusinessHour[] =>
  DAYS.filter((d) => !closed.includes(d)).map((dayOfWeek) => ({
    dayOfWeek,
    openTime: `${open}:00`,
    closingTime: `${close}:00`,
    breakStartTime: breakTime ? `${breakTime[0]}:00` : null,
    breakEndTime: breakTime ? `${breakTime[1]}:00` : null,
  }))

type PublicSeed = [name: string, category: StoreCategory, address: string, lat: number, lng: number, hours: BusinessHour[]]

const PUBLIC_SEEDS: PublicSeed[] = [
  ['강남 순댓국', 'KOREAN', '서울 강남구 강남대로 396', 37.4972, 127.0287, hours('00:00', '23:59')],
  ['역삼 칼국수', 'KOREAN', '서울 강남구 테헤란로 129', 37.4999, 127.0322, hours('10:30', '21:00', ['SUNDAY'], ['15:00', '16:30'])],
  ['테헤란 김밥', 'ETC', '서울 강남구 테헤란로 115', 37.4994, 127.0302, hours('07:00', '20:00')],
  ['신논현 돈까스', 'JAPANESE', '서울 강남구 봉은사로 102', 37.5039, 127.0247, hours('11:00', '21:30', [], ['15:00', '17:00'])],
  ['강남 우동집', 'JAPANESE', '서울 강남구 강남대로94길 15', 37.4995, 127.0265, hours('11:30', '22:00')],
  ['서초 냉면', 'KOREAN', '서울 서초구 서초대로77길 24', 37.4963, 127.0249, hours('11:00', '21:00', ['MONDAY'])],
  ['논현 곱창', 'BAR', '서울 강남구 논현로 508', 37.5013, 127.0331, hours('17:00', '02:00')],
  ['강남 샐러드랩', 'WESTERN', '서울 강남구 테헤란로 151', 37.5003, 127.0349, hours('08:00', '20:00', ['SATURDAY', 'SUNDAY'])],
  ['역삼 커피로스터스', 'CAFE', '서울 강남구 역삼로 160', 37.4955, 127.0352, hours('08:00', '22:00')],
  ['강남 마라탕', 'CHINESE', '서울 강남구 강남대로 382', 37.4961, 127.0293, hours('11:00', '23:00')],
  ['신사 화덕피자', 'WESTERN', '서울 서초구 강남대로 435', 37.5008, 127.0262, hours('11:30', '22:00', [], ['15:30', '17:00'])],
  ['강남 베이글', 'CAFE', '서울 강남구 강남대로102길 30', 37.5021, 127.0279, hours('08:00', '19:00')],
  ['역삼 쌀국수', 'ETC', '서울 강남구 논현로85길 52', 37.4987, 127.0359, hours('11:00', '21:30', ['SUNDAY'])],
  ['강남 수제버거', 'WESTERN', '서울 서초구 서초대로73길 9', 37.4948, 127.0268, hours('11:00', '22:00')],
  ['서초 생선구이', 'KOREAN', '서울 서초구 서초대로 411', 37.4932, 127.0225, hours('10:00', '21:00', [], ['14:30', '17:00'])],
  ['강남 닭갈비', 'KOREAN', '서울 강남구 테헤란로1길 20', 37.4979, 127.0311, hours('11:00', '23:00')],
  ['양재 짬뽕', 'CHINESE', '서울 서초구 강남대로 213', 37.4851, 127.0337, hours('11:00', '21:00', ['SUNDAY'])],
  ['선릉 이자카야', 'BAR', '서울 강남구 선릉로 525', 37.5043, 127.0485, hours('18:00', '01:00', ['SUNDAY'])],
]

/** 공공데이터 매장 id — 시드 매장과 겹치지 않게 1001 부터 */
export const PUBLIC_STORES: (StoreRow & { latitude: number; longitude: number })[] = PUBLIC_SEEDS.map(
  ([name, category, address, latitude, longitude, businessHours], i) => ({
    id: 1001 + i,
    ownerId: null,
    name,
    category,
    address,
    waitingAvailable: false,
    description: null,
    phone: null,
    imageUrl: null,
    policy: {
      reservationDurationMinutes: 120,
      reservationSlotMinutes: 30,
      arrivalGraceMinutes: 10,
      bookingOpenDays: 30,
      bookingDeadlineMinutes: 30,
    },
    businessHours,
    waitingSettings: { open: false, arrivalLimitMinutes: 10 },
    latitude,
    longitude,
  }),
)
