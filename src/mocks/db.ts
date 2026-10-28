/**
 * 목 API 의 메모리 DB — 백엔드 dev 응답에 있는 값만 보관
 * - 시드 데이터는 "오늘" 기준으로 만들어서 언제 열어도 예약·웨이팅 흐름을 볼 수 있음
 * - 변경 사항은 localStorage 에 저장돼 새로고침해도 유지 (날짜가 바뀌면 다시 시드)
 * - 회원 1 = 고객, 2 = 점주 (백엔드 scripts/local-seed.sql 과 같은 id)
 * - 초기화: 브라우저 콘솔에서 window.__mockDb.reset()
 */
import type {
  BusinessHour,
  CancellationActor,
  DayOfWeek,
  Menu,
  ReservationPolicy,
  ReservationStatus,
  Store,
  StoreTable,
  UserType,
  WaitingEndReason,
  WaitingSettings,
  WaitingStatus,
} from '@/entities'
import { dayjs, toStoreDateTime } from '@/shared/lib/dayjs'

/* ------------------------------------------------------------------ */
/* 레코드 타입 (API 응답 타입과 분리된 DB 원본)                          */
/* ------------------------------------------------------------------ */

export interface MemberRow {
  id: number
  name: string
  phone: string
  userType: UserType
}

export interface StoreRow extends Omit<Store, 'categoryName'> {
  ownerId: number
  description: string | null
  phone: string | null
  imageUrl: string | null
  policy: ReservationPolicy
  businessHours: BusinessHour[]
  waitingSettings: Omit<WaitingSettings, 'storeId'>
}

export interface TableRow extends StoreTable {
  storeId: number
}

export interface MenuRow extends Menu {
  storeId: number
}

export interface ReservationRow {
  reservationId: number
  storeId: number
  memberId: number
  tableId: number | null
  reservationStartAt: string
  reservationEndAt: string
  partySize: number
  status: ReservationStatus
  requestedAt: string
  confirmedAt: string | null
  checkedInAt: string | null
  checkedInByMemberId: number | null
  completedAt: string | null
  cancelledAt: string | null
  cancellationActor: CancellationActor | null
  cancellationReason: string | null
  noShowAt: string | null
  noShowByMemberId: number | null
  noShowReason: string | null
}

export interface WaitingRow {
  waitingId: number
  storeId: number
  memberId: number
  waitNumber: number
  partyCount: number
  status: WaitingStatus
  createdAt: string
  calledAt: string | null
  callExpiresAt: string | null
  updatedAt: string
  /** 고객이 도착 의사를 응답한 시각 */
  respondedAt?: string | null
  /** 종료 사유·상세·시각 (취소·노쇼·만료) */
  endReason?: WaitingEndReason | null
  endDetail?: string | null
  endedAt?: string | null
}

export interface ReviewRow {
  reviewId: number
  storeId: number
  memberId: number
  reservationId: number
  rating: number
  content: string
  imageUrl: string | null
  createdAt: string
  updatedAt: string | null
}

export interface Db {
  seededOn: string
  seq: Record<string, number>
  members: MemberRow[]
  stores: StoreRow[]
  tables: TableRow[]
  menus: MenuRow[]
  reservations: ReservationRow[]
  waitings: WaitingRow[]
  reviews: ReviewRow[]
}

/* ------------------------------------------------------------------ */
/* 시드                                                                 */
/* ------------------------------------------------------------------ */

const DAYS: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']

const hours = (
  open: string,
  close: string,
  opts: { closed?: DayOfWeek[]; weekendClose?: string; breakTime?: [string, string] } = {},
): BusinessHour[] =>
  DAYS.filter((d) => !opts.closed?.includes(d)).map((d) => ({
    dayOfWeek: d,
    openTime: `${open}:00`,
    closingTime: `${(d === 'FRIDAY' || d === 'SATURDAY') && opts.weekendClose ? opts.weekendClose : close}:00`,
    breakStartTime: opts.breakTime ? `${opts.breakTime[0]}:00` : null,
    breakEndTime: opts.breakTime ? `${opts.breakTime[1]}:00` : null,
  }))

const policy = (p: Partial<ReservationPolicy> = {}): ReservationPolicy => ({
  reservationDurationMinutes: 120,
  reservationSlotMinutes: 30,
  arrivalGraceMinutes: 10,
  bookingOpenDays: 30,
  bookingDeadlineMinutes: 30,
  ...p,
})

const waitingSettings = (open: boolean): StoreRow['waitingSettings'] => ({ open, arrivalLimitMinutes: 10 })

const CUSTOMER_NAMES = ['이하은', '김민지', '박서준', '최유진', '정하늘', '정우성', '한소희', '유재석', '강다은', '윤도현']

function seed(): Db {
  const now = dayjs()
  const today = now.format('YYYY-MM-DD')
  const iso = (d: dayjs.Dayjs) => toStoreDateTime(d.format('YYYY-MM-DD'), d.format('HH:mm'))
  /** 30분 단위로 내림한 "지금 + n분" */
  const slot = (minutesFromNow: number) => {
    const raw = now.add(minutesFromNow, 'minute')
    return raw.minute(Math.floor(raw.minute() / 30) * 30).second(0)
  }

  const members: MemberRow[] = [
    { id: 1, name: '김캐치', phone: '010-1234-5678', userType: 'CUSTOMER' },
    { id: 2, name: '박점주', phone: '010-9876-5432', userType: 'OWNER' },
    { id: 3, name: '이사장', phone: '010-5555-1234', userType: 'OWNER' },
    ...CUSTOMER_NAMES.map((name, i) => ({
      id: 10 + i,
      name,
      phone: `010-${String(2000 + i * 37).padStart(4, '0')}-${String(3000 + i * 91).padStart(4, '0')}`,
      userType: 'CUSTOMER' as const,
    })),
  ]

  const stores: StoreRow[] = [
    {
      id: 1,
      ownerId: 3,
      name: '마마카세',
      category: 'JAPANESE',
      address: '서울 강남구 학동로 123',
      waitingAvailable: false,
      description: null,
      phone: null,
      imageUrl: null,
      policy: policy(),
      businessHours: hours('11:30', '22:00', { closed: ['SUNDAY'], breakTime: ['15:00', '17:00'] }),
      waitingSettings: waitingSettings(false),
    },
    {
      id: 2,
      ownerId: 2,
      name: '혼술 이자카야',
      category: 'BAR',
      address: '서울 강남구 강남대로 45',
      waitingAvailable: true,
      description: null,
      phone: null,
      imageUrl: null,
      policy: policy({ bookingDeadlineMinutes: 0 }),
      businessHours: hours('11:30', '22:00', { weekendClose: '02:00' }),
      waitingSettings: waitingSettings(true),
    },
    {
      id: 3,
      ownerId: 3,
      name: '갓포토리',
      category: 'JAPANESE',
      address: '경기 수원시 팔달구 행궁로 7',
      waitingAvailable: false,
      description: null,
      phone: null,
      imageUrl: null,
      policy: policy({ reservationDurationMinutes: 90 }),
      businessHours: hours('17:00', '23:00', { closed: ['MONDAY'] }),
      waitingSettings: waitingSettings(false),
    },
    {
      id: 4,
      ownerId: 2,
      name: '연남동 한상',
      category: 'KOREAN',
      address: '서울 마포구 연남로 12',
      waitingAvailable: true,
      description: null,
      phone: null,
      imageUrl: null,
      policy: policy({ reservationDurationMinutes: 90 }),
      businessHours: hours('11:00', '21:00', { closed: ['SUNDAY'] }),
      waitingSettings: waitingSettings(true),
    },
    {
      id: 5,
      ownerId: 3,
      name: '북극오마카세 아카사카',
      category: 'JAPANESE',
      address: '서울 강남구 선릉로 88',
      waitingAvailable: false,
      description: null,
      phone: null,
      imageUrl: null,
      policy: policy({ reservationDurationMinutes: 150, bookingDeadlineMinutes: 60 }),
      businessHours: hours('18:00', '23:00', { closed: ['SUNDAY'] }),
      waitingSettings: waitingSettings(false),
    },
    {
      id: 6,
      ownerId: 3,
      name: '브런치 하우스',
      category: 'CAFE',
      address: '서울 성동구 성수이로 20',
      waitingAvailable: true,
      description: null,
      phone: null,
      imageUrl: null,
      policy: policy({ reservationDurationMinutes: 90 }),
      businessHours: hours('09:00', '18:00'),
      waitingSettings: waitingSettings(true),
    },
    {
      id: 7,
      ownerId: 3,
      name: '을지로 양꼬치',
      category: 'CHINESE',
      address: '서울 중구 을지로 150',
      waitingAvailable: true,
      description: null,
      phone: null,
      imageUrl: null,
      policy: policy(),
      businessHours: hours('16:00', '00:00'),
      waitingSettings: waitingSettings(true),
    },
    {
      id: 8,
      ownerId: 3,
      name: '트라토리아 몬티',
      category: 'WESTERN',
      address: '서울 용산구 이태원로 200',
      waitingAvailable: false,
      description: null,
      phone: null,
      imageUrl: null,
      policy: policy(),
      businessHours: hours('11:30', '22:00', { closed: ['MONDAY'], breakTime: ['15:00', '17:30'] }),
      waitingSettings: waitingSettings(false),
    },
  ]

  const STORE_DESCRIPTIONS: Record<number, string> = {
    1: '제철 생선으로 매일 바뀌는 오마카세. 카운터 7석과 프라이빗 룸을 운영해요.',
    2: '퇴근 후 혼자서도 편하게 들르는 꼬치 이자카야.',
    4: '9찬 백반과 보쌈 정식을 내는 동네 한식당.',
  }
  stores.forEach((s) => {
    s.description = STORE_DESCRIPTIONS[s.id] ?? null
    s.phone = `02-${String(500 + s.id * 37).padStart(4, '0')}-${String(1000 + s.id * 211).padStart(4, '0')}`
    s.imageUrl = null
  })

  let tableId = 0
  const tableSet = (storeId: number, spec: [number, number][]): TableRow[] =>
    spec.map(([minCapacity, capacity], i) => ({
      id: ++tableId,
      storeId,
      tableNumber: i + 1,
      minCapacity,
      capacity,
      status: 'ACTIVE',
    }))
  const tables: TableRow[] = [
    ...tableSet(1, [
      [2, 4],
      [2, 4],
      [1, 2],
      [1, 2],
      [4, 7],
    ]),
    ...tableSet(2, [
      [2, 4],
      [2, 4],
      [2, 2],
      [2, 6],
      [1, 2],
      [1, 2],
    ]),
    ...tableSet(3, [
      [1, 2],
      [1, 2],
      [1, 2],
      [2, 4],
    ]),
    ...tableSet(4, [
      [2, 4],
      [2, 4],
      [4, 8],
      [4, 8],
    ]),
    ...tableSet(5, [
      [1, 2],
      [1, 2],
      [2, 7],
    ]),
    ...tableSet(6, [
      [1, 2],
      [2, 4],
      [2, 4],
      [4, 6],
    ]),
    ...tableSet(7, [
      [2, 4],
      [2, 4],
      [4, 8],
    ]),
    ...tableSet(8, [
      [2, 2],
      [2, 4],
      [4, 6],
    ]),
  ]
  // 혼술 이자카야 6번 테이블은 미운영
  tables.find((t) => t.storeId === 2 && t.tableNumber === 6)!.status = 'INACTIVE'

  let menuId = 0
  const menuSet = (storeId: number, items: [string, number, string][]): MenuRow[] =>
    items.map(([name, price, description]) => ({ id: ++menuId, storeId, name, price, description }))
  const menus: MenuRow[] = [
    ...menuSet(1, [
      ['오마카세 A코스', 120000, '제철 스시 12피스 + 디저트'],
      ['오마카세 B코스', 85000, '스시 10피스 + 우동'],
      ['런치 코스', 45000, '스시 8피스'],
    ]),
    ...menuSet(2, [
      ['모둠 꼬치 (8개)', 24000, '닭·돼지·채소 꼬치'],
      ['명란 계란말이', 13000, '반숙 명란 + 계란'],
      ['하이볼', 8000, '산토리 가쿠빈'],
    ]),
    ...menuSet(3, [
      ['갓포 코스', 38000, '제철 생선 5품'],
      ['사케 페어링', 25000, '코스에 맞춘 사케 3잔'],
    ]),
    ...menuSet(4, [
      ['한상 정식', 15000, '제철 반찬 9찬 + 된장찌개'],
      ['보쌈 정식', 18000, '수육 + 보쌈김치'],
    ]),
    ...menuSet(5, [['디너 오마카세', 150000, '스시 15피스 + 요리 3품']]),
    ...menuSet(6, [
      ['에그 베네딕트', 16000, '수란 + 홀랜다이즈'],
      ['리코타 팬케이크', 15000, '베리 콤포트'],
    ]),
    ...menuSet(7, [
      ['양꼬치 (10개)', 16000, '숯불 직화'],
      ['꿔바로우', 18000, '찹쌀 탕수육'],
    ]),
    ...menuSet(8, [
      ['트러플 크림 파스타', 26000, '생면 탈리아텔레'],
      ['마르게리타 피자', 22000, '화덕 나폴리 피자'],
    ]),
  ]

  /* ---------- 예약 ---------- */
  let reservationId = 100
  const reservations: ReservationRow[] = []
  const addReservation = (
    r: Pick<ReservationRow, 'storeId' | 'memberId' | 'partySize' | 'status'> & {
      start: dayjs.Dayjs
      tableNumber: number
      checkedIn?: boolean
    },
  ) => {
    const store = stores.find((s) => s.id === r.storeId)!
    const table = tables.find((t) => t.storeId === r.storeId && t.tableNumber === r.tableNumber)!
    const end = r.start.add(store.policy.reservationDurationMinutes, 'minute')
    const requested = r.start.subtract(2, 'day')
    reservations.push({
      reservationId: ++reservationId,
      storeId: r.storeId,
      memberId: r.memberId,
      tableId: table.id,
      reservationStartAt: iso(r.start),
      reservationEndAt: iso(end),
      partySize: r.partySize,
      status: r.status,
      requestedAt: iso(requested),
      confirmedAt: iso(requested),
      checkedInAt: r.checkedIn || r.status === 'COMPLETED' ? iso(r.start.add(3, 'minute')) : null,
      checkedInByMemberId: r.checkedIn || r.status === 'COMPLETED' ? store.ownerId : null,
      completedAt: r.status === 'COMPLETED' ? iso(end) : null,
      cancelledAt: r.status === 'CANCELLED' ? iso(requested.add(1, 'day')) : null,
      cancellationActor: r.status === 'CANCELLED' ? 'CUSTOMER' : null,
      cancellationReason: null,
      noShowAt: r.status === 'NO_SHOW' ? iso(r.start.add(20, 'minute')) : null,
      noShowByMemberId: r.status === 'NO_SHOW' ? store.ownerId : null,
      noShowReason: r.status === 'NO_SHOW' ? '연락 두절' : null,
    })
  }

  // 고객(김캐치) 내역
  const tomorrow18 = now.add(1, 'day').hour(18).minute(0).second(0)
  addReservation({ storeId: 1, memberId: 1, partySize: 2, status: 'CONFIRMED', start: tomorrow18, tableNumber: 1 })
  addReservation({
    storeId: 4,
    memberId: 1,
    partySize: 4,
    status: 'COMPLETED',
    start: now.subtract(5, 'day').hour(19).minute(0),
    tableNumber: 3,
  })
  addReservation({
    storeId: 3,
    memberId: 1,
    partySize: 2,
    status: 'CANCELLED',
    start: now.subtract(12, 'day').hour(18).minute(30),
    tableNumber: 1,
  })
  addReservation({
    storeId: 8,
    memberId: 1,
    partySize: 2,
    status: 'COMPLETED',
    start: now.subtract(20, 'day').hour(12).minute(0),
    tableNumber: 2,
  })

  // 점주(혼술 이자카야) 오늘 예약 현황 — 지금 시각 기준
  addReservation({ storeId: 2, memberId: 10, partySize: 2, status: 'CONFIRMED', start: slot(-60), tableNumber: 1, checkedIn: true })
  addReservation({ storeId: 2, memberId: 11, partySize: 2, status: 'CONFIRMED', start: slot(-30), tableNumber: 2 })
  addReservation({ storeId: 2, memberId: 12, partySize: 4, status: 'CONFIRMED', start: slot(30), tableNumber: 4 })
  addReservation({ storeId: 2, memberId: 13, partySize: 3, status: 'COMPLETED', start: slot(-240), tableNumber: 4 })
  addReservation({ storeId: 2, memberId: 14, partySize: 2, status: 'NO_SHOW', start: slot(-180), tableNumber: 3 })
  addReservation({ storeId: 2, memberId: 18, partySize: 2, status: 'CONFIRMED', start: slot(90), tableNumber: 5 })
  // 과거 매출용 이용 완료 예약 — 월별 비교(최근 4개월 + 직전 4개월)가 되도록 약 8개월치
  for (let d = 1; d <= 250; d++) {
    const count = d <= 40 ? 2 + ((d * 7) % 5) : 1 + ((d * 3) % 4)
    for (let k = 0; k < count; k++) {
      addReservation({
        storeId: 2,
        memberId: 10 + ((d + k) % CUSTOMER_NAMES.length),
        partySize: 2 + ((d + k) % 3),
        status: (d + k) % 11 === 0 ? 'NO_SHOW' : 'COMPLETED',
        start: now
          .subtract(d, 'day')
          .hour(17 + (k % 5))
          .minute(k % 2 ? 30 : 0),
        tableNumber: 1 + (k % 5),
      })
    }
  }

  /* ---------- 웨이팅 ---------- */
  let waitingId = 200
  const waitings: WaitingRow[] = []
  const addWaiting = (
    storeId: number,
    memberId: number,
    waitNumber: number,
    partyCount: number,
    status: WaitingStatus,
    minutesAgo: number,
  ) => {
    const createdAt = iso(now.subtract(minutesAgo, 'minute'))
    const called = status === 'CALLED'
    waitings.push({
      waitingId: ++waitingId,
      storeId,
      memberId,
      waitNumber,
      partyCount,
      status,
      createdAt,
      calledAt: called ? iso(now.subtract(2, 'minute')) : null,
      callExpiresAt: called ? iso(now.add(8, 'minute')) : null,
      updatedAt: createdAt,
    })
  }
  // 혼술 이자카야 대기열 — 김캐치는 4번째(앞에 3팀, 그중 1팀 호출됨)
  addWaiting(2, 15, 9, 2, 'SEATED', 50)
  addWaiting(2, 16, 10, 2, 'CALLED', 25)
  addWaiting(2, 17, 11, 4, 'WAITING', 20)
  addWaiting(2, 19, 12, 2, 'WAITING', 15)
  addWaiting(2, 1, 13, 2, 'WAITING', 10)
  // 연남동 한상
  addWaiting(4, 12, 4, 3, 'WAITING', 12)
  addWaiting(4, 13, 5, 2, 'WAITING', 6)
  // 브런치 하우스
  for (let i = 0; i < 6; i++) addWaiting(6, 10 + i, 20 + i, 2 + (i % 3), 'WAITING', 40 - i * 5)
  // 지난 웨이팅
  addWaiting(7, 1, 31, 3, 'SEATED', 60 * 24 * 3)

  /* ---------- 리뷰 ---------- */
  let reviewId = 300
  const reviewTexts: [number, string][] = [
    [5, '분위기도 좋고 맛도 최고예요! 재방문 의사 있습니다.'],
    [4, '웨이팅 없이 바로 입장했어요. 코스 구성이 알차요.'],
    [5, '직원분들이 친절하고 음식이 빨리 나와요.'],
    [3, '맛은 괜찮은데 자리가 조금 좁았어요.'],
    [5, '기념일에 방문했는데 너무 만족스러웠어요.'],
    [4, '가격 대비 훌륭합니다. 하이볼 추천!'],
  ]
  const reviews: ReviewRow[] = []
  stores.forEach((store, si) => {
    const n = 3 + (si % 4)
    for (let i = 0; i < n; i++) {
      const [rating, content] = reviewTexts[(si + i) % reviewTexts.length]
      const created = now.subtract(1 + i * 4 + si, 'day')
      reviews.push({
        reviewId: ++reviewId,
        storeId: store.id,
        memberId: 10 + ((si + i) % CUSTOMER_NAMES.length),
        reservationId: 0,
        rating,
        content,
        imageUrl: null,
        createdAt: iso(created),
        updatedAt: null,
      })
    }
  })
  // 김캐치가 쓴 리뷰 (트라토리아 몬티 방문)
  const montiVisit = reservations.find((r) => r.memberId === 1 && r.storeId === 8)!
  reviews.push({
    reviewId: ++reviewId,
    storeId: 8,
    memberId: 1,
    reservationId: montiVisit.reservationId,
    rating: 5,
    content: '트러플 파스타가 정말 맛있었어요. 창가 자리 추천합니다.',
    imageUrl: null,
    createdAt: iso(now.subtract(19, 'day')),
    updatedAt: null,
  })

  return {
    seededOn: today,
    seq: { member: 100, store: 100, table: tableId, menu: menuId, reservation: reservationId, waiting: waitingId, review: reviewId },
    members,
    stores,
    tables,
    menus,
    reservations,
    waitings,
    reviews,
  }
}

/* ------------------------------------------------------------------ */
/* 저장 / 불러오기                                                      */
/* ------------------------------------------------------------------ */

// v4: 백엔드 응답에 없는 값(평점·지역·좌석 타입·알림함 등)을 뺌
const STORAGE_KEY = 'catchtable-mock-db-v4'

function load(): Db {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const saved = JSON.parse(raw) as Db
      if (saved.seededOn === dayjs().format('YYYY-MM-DD')) return saved
    }
  } catch {
    /* 저장된 값이 없거나 깨짐 — 새로 시드 */
  }
  return seed()
}

export let db: Db = load()

export function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    /* 저장소 사용 불가 — 메모리로만 동작 */
  }
}

export function resetDb() {
  db = seed()
  persist()
}

export function nextId(key: keyof Db['seq'] & string) {
  db.seq[key] = (db.seq[key] ?? 0) + 1
  return db.seq[key]
}

if (typeof window !== 'undefined') {
  ;(window as unknown as { __mockDb: unknown }).__mockDb = {
    get: () => db,
    reset: () => {
      resetDb()
      window.location.reload()
    },
  }
}
