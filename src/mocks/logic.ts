/**
 * 목 API 도메인 규칙 — 백엔드 dev 의 규칙(예약 가능 시간, 테이블 자동 배정, 노쇼 조건,
 * 자동 이용 완료 등)을 단순화해서 옮김. 응답 변환(presenter)도 여기서 담당
 */
import type {
  NotificationMessage,
  NotificationType,
  OwnerReservation,
  OwnerWaiting,
  Reservation,
  Review,
  Store,
  StoreDetail,
  TableType,
  Waiting,
} from '@/entities'
import { ACTIVE_WAITING_STATUSES, STORE_CATEGORY_LABEL, TABLE_TYPE_LABEL, toDayOfWeek } from '@/entities'
import { dayjs, toStoreDateTime } from '@/shared/lib/dayjs'
import { db, nextId, persist, type ReservationRow, type StoreRow, type TableRow, type WaitingRow } from './db'

export const now = () => dayjs()
export const nowIso = () => toIso(now())
export const toIso = (d: dayjs.Dayjs) => toStoreDateTime(d.format('YYYY-MM-DD'), d.format('HH:mm:ss'))

/* ------------------------------------------------------------------ */
/* 조회 헬퍼                                                            */
/* ------------------------------------------------------------------ */

export const findStore = (id: number) => db.stores.find((s) => s.id === id)
export const findMember = (id: number) => db.members.find((m) => m.id === id)
export const storeTables = (storeId: number) => db.tables.filter((t) => t.storeId === storeId)
export const tableOf = (tableId: number | null) => db.tables.find((t) => t.id === tableId)

/* ------------------------------------------------------------------ */
/* 영업시간 · 예약 가능 시간                                              */
/* ------------------------------------------------------------------ */

/** 해당 날짜에 시작하는 영업 구간 (마감이 오픈보다 이르면 다음날 마감) */
export function openingWindow(store: StoreRow, date: string) {
  const day = toDayOfWeek(dayjs(date).day())
  const bh = store.businessHours.find((h) => h.dayOfWeek === day)
  if (!bh) return null
  const start = dayjs(`${date}T${bh.openTime}`)
  let end = dayjs(`${date}T${bh.closingTime}`)
  if (!end.isAfter(start)) end = end.add(1, 'day')
  const breakTime =
    bh.breakStartTime && bh.breakEndTime
      ? { start: dayjs(`${date}T${bh.breakStartTime}`), end: dayjs(`${date}T${bh.breakEndTime}`) }
      : null
  return { start, end, breakTime }
}

const overlaps = (aStart: dayjs.Dayjs, aEnd: dayjs.Dayjs, bStart: dayjs.Dayjs, bEnd: dayjs.Dayjs) =>
  aStart.isBefore(bEnd) && bStart.isBefore(aEnd)

/** 해당 시간대에 이미 사용 중인 테이블 id (확정 예약 + 유효한 선점) */
function occupiedTableIds(storeId: number, start: dayjs.Dayjs, end: dayjs.Dayjs, excludeReservationId?: number) {
  const ids = new Set<number>()
  db.reservations.forEach((r) => {
    if (r.storeId !== storeId || r.status !== 'CONFIRMED' || r.tableId == null) return
    if (r.reservationId === excludeReservationId) return
    if (overlaps(start, end, dayjs(r.reservationStartAt), dayjs(r.reservationEndAt))) ids.add(r.tableId)
  })
  db.holds.forEach((h) => {
    if (h.storeId !== storeId || h.status !== 'HOLDING') return
    const store = findStore(storeId)!
    const hs = dayjs(h.reservationStartAt)
    if (overlaps(start, end, hs, hs.add(store.policy.reservationDurationMinutes, 'minute'))) ids.add(h.tableId)
  })
  return ids
}

const fits = (t: TableRow, partySize: number) =>
  t.status === 'ACTIVE' && t.minCapacity <= partySize && partySize <= t.capacity

/** 예약 가능한 테이블 (남는 자리가 적은 순) */
export function freeTables(
  store: StoreRow,
  startAt: dayjs.Dayjs,
  partySize: number,
  opts: { preferredType?: TableType; excludeReservationId?: number } = {},
) {
  const end = startAt.add(store.policy.reservationDurationMinutes, 'minute')
  const occupied = occupiedTableIds(store.id, startAt, end, opts.excludeReservationId)
  const candidates = storeTables(store.id)
    .filter((t) => fits(t, partySize) && !occupied.has(t.id))
    .sort((a, b) => a.capacity - b.capacity || a.tableNumber - b.tableNumber)
  if (opts.preferredType) {
    const preferred = candidates.filter((t) => t.tableType === opts.preferredType)
    if (preferred.length > 0) return preferred
  }
  return candidates
}

export type BookableError = 'BOOKING_NOT_OPEN_YET' | 'BOOKING_DEADLINE_PASSED' | 'OUTSIDE_BUSINESS_HOURS'

/** 예약 가능 시각 검증 — 백엔드 ReservationAvailabilityService.validateBookable 단순화 */
export function validateBookable(store: StoreRow, startAt: dayjs.Dayjs): BookableError | null {
  const current = now()
  if (startAt.isAfter(current.startOf('day').add(store.policy.bookingOpenDays + 1, 'day'))) return 'BOOKING_NOT_OPEN_YET'
  if (startAt.subtract(store.policy.bookingDeadlineMinutes, 'minute').isBefore(current)) return 'BOOKING_DEADLINE_PASSED'
  const window = openingWindow(store, startAt.format('YYYY-MM-DD'))
  const end = startAt.add(store.policy.reservationDurationMinutes, 'minute')
  if (!window || startAt.isBefore(window.start) || end.isAfter(window.end)) return 'OUTSIDE_BUSINESS_HOURS'
  if (window.breakTime && startAt.isBefore(window.breakTime.end) && !startAt.isBefore(window.breakTime.start)) {
    return 'OUTSIDE_BUSINESS_HOURS'
  }
  return null
}

/** GET /availability — 날짜의 예약 슬롯과 잔여 테이블 수 */
export function availability(store: StoreRow, date: string, partySize: number) {
  const window = openingWindow(store, date)
  const slots: { reservationStartAt: string; availableTableCount: number; available: boolean }[] = []
  if (!window) return slots
  const step = store.policy.reservationSlotMinutes
  for (
    let t = window.start;
    !t.add(store.policy.reservationDurationMinutes, 'minute').isAfter(window.end);
    t = t.add(step, 'minute')
  ) {
    if (window.breakTime && !t.isBefore(window.breakTime.start) && t.isBefore(window.breakTime.end)) continue
    const bookable = validateBookable(store, t) === null
    const count = bookable ? freeTables(store, t, partySize).length : 0
    slots.push({ reservationStartAt: toIso(t), availableTableCount: count, available: bookable && count > 0 })
  }
  return slots
}

/* ------------------------------------------------------------------ */
/* 웨이팅                                                               */
/* ------------------------------------------------------------------ */

export const activeQueue = (storeId: number) =>
  db.waitings
    .filter((w) => w.storeId === storeId && ACTIVE_WAITING_STATUSES.includes(w.status))
    .sort((a, b) => a.waitNumber - b.waitNumber)

export const teamsAhead = (w: WaitingRow) =>
  activeQueue(w.storeId).filter((x) => x.waitNumber < w.waitNumber).length

/* ------------------------------------------------------------------ */
/* 알림 (+ SSE 전송)                                                     */
/* ------------------------------------------------------------------ */

type Listener = (message: NotificationMessage) => void
const listeners = new Map<number, Set<Listener>>()

export function subscribe(memberId: number, listener: Listener) {
  if (!listeners.has(memberId)) listeners.set(memberId, new Set())
  listeners.get(memberId)!.add(listener)
  return () => listeners.get(memberId)?.delete(listener)
}

export function notify(memberId: number, type: NotificationType, targetId: number, title: string, message: string) {
  const member = findMember(memberId)
  const category = type.startsWith('RESERVATION') ? 'reservation' : 'waiting'
  if (member && !member.notificationSettings[category]) return
  const createdAt = nowIso()
  db.notifications.push({ id: nextId('notification'), memberId, type, targetId, title, message, read: false, createdAt })
  const payload: NotificationMessage = { eventId: crypto.randomUUID(), type, targetId, message, occurredAt: createdAt }
  listeners.get(memberId)?.forEach((fn) => fn(payload))
}

/* ------------------------------------------------------------------ */
/* 시간 흐름 처리 — 요청마다 + 주기적으로 실행                              */
/* ------------------------------------------------------------------ */

export function tick() {
  const current = now()
  let changed = false

  // 방문 확인 후 이용시간이 끝난 예약 → 이용 완료 (백엔드 completeVisitedReservations)
  db.reservations.forEach((r) => {
    if (r.status === 'CONFIRMED' && r.checkedInAt && !dayjs(r.reservationEndAt).isAfter(current)) {
      r.status = 'COMPLETED'
      r.completedAt = r.reservationEndAt
      changed = true
    }
  })

  // 선점 5분 만료
  db.holds.forEach((h) => {
    if (h.status === 'HOLDING' && !dayjs(h.expiresAt).isAfter(current)) {
      h.status = 'EXPIRED'
      changed = true
    }
  })

  // 호출 후 제한시간 초과 → 순번 만료
  db.waitings.forEach((w) => {
    if ((w.status === 'CALLED' || w.status === 'CONFIRMED') && w.callExpiresAt && !dayjs(w.callExpiresAt).isAfter(current)) {
      w.status = 'EXPIRED'
      w.updatedAt = toIso(current)
      changed = true
      const store = findStore(w.storeId)
      notify(w.memberId, 'WAITING_EXPIRED', w.waitingId, '웨이팅 순번이 만료됐어요', `${store?.name} · 호출 후 제한시간이 지났어요`)
    }
  })

  if (changed) persist()
}

/**
 * 데모용 대기열 진행 — 고객(데모 계정)이 대기 중인 매장은 앞 팀이 15초마다 한 팀씩 입장하고,
 * 내 차례가 되면 입장 호출 알림을 보냄 (점주가 직접 호출·착석 처리하는 것도 그대로 반영됨)
 */
const DEMO_STEP_MS = 15_000
export function advanceDemoQueues() {
  const demoStores = new Set(
    db.waitings.filter((w) => w.status === 'WAITING' && findMember(w.memberId)?.email === 'catch@example.com').map((w) => w.storeId),
  )
  let changed = false
  demoStores.forEach((storeId) => {
    const queue = activeQueue(storeId)
    const head = queue[0]
    if (!head) return
    if (head.memberId === 1 || findMember(head.memberId)?.email === 'catch@example.com') {
      if (head.status === 'WAITING') {
        callWaiting(head)
        changed = true
      }
      return
    }
    // 앞 팀 처리: 대기 → 호출 → 착석 순으로 한 단계씩
    if (dayjs().diff(dayjs(head.updatedAt), 'millisecond') < DEMO_STEP_MS) return
    head.status = head.status === 'WAITING' ? 'CALLED' : 'SEATED'
    head.updatedAt = nowIso()
    changed = true
  })
  if (changed) persist()
}

export function callWaiting(w: WaitingRow) {
  const store = findStore(w.storeId)!
  const current = now()
  w.status = 'CALLED'
  w.calledAt = toIso(current)
  w.callExpiresAt = toIso(current.add(store.waitingSettings.arrivalLimitMinutes, 'minute'))
  w.updatedAt = w.calledAt
  notify(
    w.memberId,
    'WAITING_CALLED',
    w.waitingId,
    '입장 가능합니다!',
    `${store.name} 웨이팅 · ${store.waitingSettings.arrivalLimitMinutes}분 안에 도착 의사를 알려주세요`,
  )
}

/* ------------------------------------------------------------------ */
/* 응답 변환                                                             */
/* ------------------------------------------------------------------ */

export function storeStats(storeId: number) {
  const reviews = db.reviews.filter((r) => r.storeId === storeId)
  const rating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0
  return {
    rating: Math.round(rating * 10) / 10,
    reviewCount: reviews.length,
    waitingTeams: activeQueue(storeId).length,
  }
}

export function toStore(row: StoreRow, distanceMeters?: number): Store {
  const stats = storeStats(row.id)
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    categoryName: STORE_CATEGORY_LABEL[row.category],
    address: row.address,
    waitingAvailable: row.waitingAvailable && row.waitingSettings.open,
    thumbnailUrl: row.thumbnailUrl,
    region: row.region,
    rating: stats.rating,
    reviewCount: stats.reviewCount,
    priceRange: row.priceRange,
    maxPartySize: row.maxPartySize,
    depositAmount: row.depositAmount,
    waitingTeams: stats.waitingTeams,
    latitude: row.latitude,
    longitude: row.longitude,
    ...(distanceMeters != null && { distanceMeters }),
  }
}

export const toStoreDetail = (row: StoreRow): StoreDetail => ({ ...toStore(row), businessHours: row.businessHours })

export function toReservation(r: ReservationRow): Reservation {
  const table = tableOf(r.tableId)
  return {
    reservationId: r.reservationId,
    storeId: r.storeId,
    storeName: findStore(r.storeId)?.name ?? '',
    tableId: r.tableId,
    reservationStartAt: r.reservationStartAt,
    reservationEndAt: r.reservationEndAt,
    partySize: r.partySize,
    status: r.status,
    requestedAt: r.requestedAt,
    confirmedAt: r.confirmedAt,
    cancelledAt: r.cancelledAt,
    cancellationActor: r.cancellationActor,
    cancellationReason: r.cancellationReason,
    checkedInAt: r.checkedInAt,
    tableNumber: table?.tableNumber ?? null,
    tableTypeLabel: table ? TABLE_TYPE_LABEL[table.tableType] : null,
    reviewed: db.reviews.some((v) => v.reservationId === r.reservationId),
  }
}

export function toOwnerReservation(r: ReservationRow): OwnerReservation {
  const member = findMember(r.memberId)
  const table = tableOf(r.tableId)
  return {
    reservationId: r.reservationId,
    storeId: r.storeId,
    memberId: r.memberId,
    customerName: member?.name ?? '',
    customerPhone: member?.phone ?? '',
    tableId: r.tableId,
    reservationStartAt: r.reservationStartAt,
    reservationEndAt: r.reservationEndAt,
    partySize: r.partySize,
    status: r.status,
    checkedInAt: r.checkedInAt,
    checkedInByMemberId: r.checkedInByMemberId,
    cancelledAt: r.cancelledAt,
    cancellationActor: r.cancellationActor,
    cancellationReason: r.cancellationReason,
    noShowAt: r.noShowAt,
    noShowByMemberId: r.noShowByMemberId,
    noShowReason: r.noShowReason,
    tableNumber: table?.tableNumber ?? null,
    tableTypeLabel: table ? TABLE_TYPE_LABEL[table.tableType] : null,
  }
}

export function toWaiting(w: WaitingRow): Waiting {
  const active = ACTIVE_WAITING_STATUSES.includes(w.status)
  const ahead = active ? teamsAhead(w) : 0
  return {
    waitingId: w.waitingId,
    storeId: w.storeId,
    waitNumber: w.waitNumber,
    partyCount: w.partyCount,
    status: w.status,
    teamsAhead: ahead,
    storeName: findStore(w.storeId)?.name,
    seatPreference: w.seatPreference,
    createdAt: w.createdAt,
    calledAt: w.calledAt,
    callExpiresAt: w.callExpiresAt,
    deferRemaining: w.deferRemaining,
    estimatedMinutes: active && w.status === 'WAITING' ? Math.max(1, ahead) * 4 : null,
  }
}

export function toOwnerWaiting(w: WaitingRow): OwnerWaiting {
  const member = findMember(w.memberId)
  return {
    ...toWaiting(w),
    memberId: w.memberId,
    customerName: member?.name ?? '',
    customerPhone: member?.phone ?? '',
    recallCount: w.recallCount,
  }
}

export function toReview(r: (typeof db.reviews)[number]): Review {
  return {
    reviewId: r.reviewId,
    storeId: r.storeId,
    storeName: findStore(r.storeId)?.name ?? '',
    reservationId: r.reservationId,
    authorName: maskName(findMember(r.memberId)?.name ?? '고객'),
    rating: r.rating,
    content: r.content,
    imageUrls: r.imageUrls,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    reply: r.reply,
  }
}

/** 리뷰 작성자 이름 가리기 — 김캐치 → 김*치 */
const maskName = (name: string) =>
  name.length <= 2 ? `${name[0]}*` : `${name[0]}${'*'.repeat(name.length - 2)}${name[name.length - 1]}`

/** 두 좌표 사이 거리(m) */
export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371e3
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(a)))
}
