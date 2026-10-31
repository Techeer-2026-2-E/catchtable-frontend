/**
 * 목 API 도메인 규칙 — 백엔드 dev 의 규칙(예약 가능 시간, 테이블 자동 배정, 노쇼 조건,
 * 자동 이용 완료 등)을 단순화해서 옮김. 응답 변환(presenter)도 여기서 담당
 */
import type {
  HistoryItem,
  MyReview,
  NotificationMessage,
  NotificationType,
  OwnerReservation,
  OwnerWaiting,
  Reservation,
  Store,
  StoreDetail,
  StoreReview,
  Waiting,
  WaitingEndReason,
  WaitingRegistration,
  WaitingTermination,
} from '@/entities'
import { ACTIVE_WAITING_STATUSES, STORE_CATEGORY_LABEL, toDayOfWeek } from '@/entities'
import { dayjs, toStoreDateTime } from '@/shared/lib/dayjs'
import { db, persist, type ReservationRow, type ReviewRow, type StoreRow, type TableRow, type WaitingRow } from './db'

export const now = () => dayjs()
export const nowIso = () => toIso(now())
export const toIso = (d: dayjs.Dayjs) => toStoreDateTime(d.format('YYYY-MM-DD'), d.format('HH:mm:ss'))

/* ------------------------------------------------------------------ */
/* 조회 헬퍼                                                            */
/* ------------------------------------------------------------------ */

export const findStore = (id: number) => db.stores.find((s) => s.id === id)
export const findMember = (id: number) => db.members.find((m) => m.id === id)
export const storeTables = (storeId: number) => db.tables.filter((t) => t.storeId === storeId)

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
  const onBusinessDay = (time: string) => {
    const value = dayjs(`${date}T${time}`)
    return value.isBefore(start) ? value.add(1, 'day') : value
  }
  const breakTime = bh.breakStartTime && bh.breakEndTime
    ? { start: onBusinessDay(bh.breakStartTime), end: onBusinessDay(bh.breakEndTime) } : null
  return { start, end, breakTime }
}

const overlaps = (aStart: dayjs.Dayjs, aEnd: dayjs.Dayjs, bStart: dayjs.Dayjs, bEnd: dayjs.Dayjs) =>
  aStart.isBefore(bEnd) && bStart.isBefore(aEnd)

/** 해당 시간대에 이미 사용 중인 테이블 id (확정 예약) */
function occupiedTableIds(storeId: number, start: dayjs.Dayjs, end: dayjs.Dayjs, excludeReservationId?: number) {
  const ids = new Set<number>()
  db.reservations.forEach((r) => {
    if (r.storeId !== storeId || r.status !== 'CONFIRMED' || r.tableId == null) return
    if (r.reservationId === excludeReservationId) return
    if (overlaps(start, end, dayjs(r.reservationStartAt), dayjs(r.reservationEndAt))) ids.add(r.tableId)
  })
  return ids
}

const fits = (t: TableRow, partySize: number) => t.status === 'ACTIVE' && t.minCapacity <= partySize && partySize <= t.capacity

/** 예약 가능한 테이블 (남는 자리가 적은 순) */
export function freeTables(store: StoreRow, startAt: dayjs.Dayjs, partySize: number, opts: { excludeReservationId?: number } = {}) {
  const end = startAt.add(store.policy.reservationDurationMinutes, 'minute')
  const occupied = occupiedTableIds(store.id, startAt, end, opts.excludeReservationId)
  const candidates = storeTables(store.id)
    .filter((t) => fits(t, partySize) && !occupied.has(t.id))
    .sort((a, b) => a.capacity - b.capacity || a.tableNumber - b.tableNumber)
  return candidates
}

export type BookableError = 'BOOKING_NOT_OPEN_YET' | 'BOOKING_DEADLINE_PASSED' | 'OUTSIDE_BUSINESS_HOURS'

/** 예약 가능 시각 검증 — 백엔드 ReservationAvailabilityService.validateBookable 단순화 */
export function validateBookable(store: StoreRow, startAt: dayjs.Dayjs): BookableError | null {
  const current = now()
  if (startAt.isAfter(current.startOf('day').add(store.policy.bookingOpenDays + 1, 'day'))) return 'BOOKING_NOT_OPEN_YET'
  if (startAt.subtract(store.policy.bookingDeadlineMinutes, 'minute').isBefore(current)) return 'BOOKING_DEADLINE_PASSED'
  const end = startAt.add(store.policy.reservationDurationMinutes, 'minute')
  const windows = [openingWindow(store, startAt.subtract(1, 'day').format('YYYY-MM-DD')), openingWindow(store, startAt.format('YYYY-MM-DD'))]
  return windows.some((window) => window && !startAt.isBefore(window.start) && !end.isAfter(window.end)
    && (!window.breakTime || !overlaps(startAt, end, window.breakTime.start, window.breakTime.end)))
    ? null : 'OUTSIDE_BUSINESS_HOURS'
}

/** GET /availability — 날짜의 예약 슬롯과 잔여 테이블 수 */
export function availability(store: StoreRow, date: string, partySize: number) {
  const slots: { reservationStartAt: string; availableTableCount: number; available: boolean }[] = []
  const dayStart = dayjs(date).startOf('day')
  const dayEnd = dayStart.add(1, 'day')
  const windows = [openingWindow(store, dayStart.subtract(1, 'day').format('YYYY-MM-DD')), openingWindow(store, date)]
  const step = store.policy.reservationSlotMinutes
  for (const window of windows) {
    if (!window) continue
    let first = window.start.isBefore(dayStart) ? dayStart : window.start
    const remainder = (first.hour() * 60 + first.minute()) % step
    if (remainder) first = first.add(step - remainder, 'minute')
    for (let t = first; t.isBefore(dayEnd) && !t.add(store.policy.reservationDurationMinutes, 'minute').isAfter(window.end); t = t.add(step, 'minute')) {
      if (validateBookable(store, t)) continue
      const count = freeTables(store, t, partySize).length
      slots.push({ reservationStartAt: toIso(t), availableTableCount: count, available: count > 0 })
    }
  }
  return [...new Map(slots.map((slot) => [slot.reservationStartAt, slot])).values()]
    .sort((a, b) => a.reservationStartAt.localeCompare(b.reservationStartAt))
}

/* ------------------------------------------------------------------ */
/* 웨이팅                                                               */
/* ------------------------------------------------------------------ */

export const activeQueue = (storeId: number) =>
  db.waitings.filter((w) => w.storeId === storeId && ACTIVE_WAITING_STATUSES.includes(w.status)).sort((a, b) => a.waitNumber - b.waitNumber)

export const teamsAhead = (w: WaitingRow) => activeQueue(w.storeId).filter((x) => x.waitNumber < w.waitNumber).length

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

/** 백엔드 NotificationMessage.occurredAt 은 LocalDateTime (오프셋 없음) */
const localNow = () => now().format('YYYY-MM-DDTHH:mm:ss')

export function notify(
  memberId: number,
  type: NotificationType,
  targetId: number,
  message: string,
  payload: NotificationMessage['payload'] = null,
) {
  const event: NotificationMessage = { eventId: crypto.randomUUID(), type, targetId, message, payload, occurredAt: localNow() }
  listeners.get(memberId)?.forEach((fn) => fn(event))
}

/* ---------- 점주 실시간 구독 — 매장 대기 목록이 바뀌면 WAITING_CHANGED (targetId = 매장 id) ---------- */

const ownerListeners = new Map<number, Set<Listener>>()

export function subscribeOwner(storeId: number, listener: Listener) {
  if (!ownerListeners.has(storeId)) ownerListeners.set(storeId, new Set())
  ownerListeners.get(storeId)!.add(listener)
  return () => ownerListeners.get(storeId)?.delete(listener)
}

/**
 * 대기열이 바뀐 뒤 호출 — 점주에게 WAITING_CHANGED, 대기 중인 고객에게 WAITING_POSITION_CHANGED
 * (백엔드 WaitingEventPublisher 와 같은 이벤트 이름)
 */
export function queueChanged(storeId: number) {
  const event: NotificationMessage = {
    eventId: crypto.randomUUID(),
    type: 'WAITING_CHANGED',
    targetId: storeId,
    message: '대기 목록이 변경되었습니다.',
    payload: null,
    occurredAt: localNow(),
  }
  ownerListeners.get(storeId)?.forEach((fn) => fn(event))
  activeQueue(storeId)
    .filter((w) => w.status === 'WAITING')
    .forEach((w) => {
      const ahead = teamsAhead(w)
      notify(w.memberId, 'WAITING_POSITION_CHANGED', w.waitingId, `현재 ${ahead + 1}번째 순서예요`, {
        waitingId: w.waitingId,
        currentPosition: ahead + 1,
        teamsAhead: ahead,
        status: w.status,
      })
    })
}

/** 웨이팅 종료 처리 (취소·노쇼·만료) */
export function endWaiting(w: WaitingRow, status: 'CANCELED' | 'NO_SHOW', reason: WaitingEndReason, detail: string | null = null) {
  w.status = status
  w.endReason = reason
  w.endDetail = detail
  w.endedAt = nowIso()
  w.updatedAt = w.endedAt
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

  // 호출 후 제한시간 초과 → 순번 만료
  db.waitings.forEach((w) => {
    if ((w.status === 'CALLED' || w.status === 'CONFIRMED') && w.callExpiresAt && !dayjs(w.callExpiresAt).isAfter(current)) {
      endWaiting(w, 'NO_SHOW', 'AUTO_EXPIRED')
      changed = true
      const store = findStore(w.storeId)
      notify(w.memberId, 'WAITING_EXPIRED', w.waitingId, `${store?.name} 호출 후 제한시간이 지났어요`)
      queueChanged(w.storeId)
    }
  })

  if (changed) persist()
}

/**
 * 데모용 대기열 진행 — 고객(데모 계정)이 대기 중인 매장은 앞 팀이 15초마다 한 팀씩 입장하고,
 * 내 차례가 되면 입장 호출 알림을 보냄 (점주가 직접 호출·착석 처리하는 것도 그대로 반영됨)
 */
const DEMO_STEP_MS = 15_000
/** 고객 시작 회원 (백엔드 local-seed 와 같은 id) */
const DEMO_CUSTOMER_ID = 1
export function advanceDemoQueues() {
  const demoStores = new Set(db.waitings.filter((w) => w.status === 'WAITING' && w.memberId === DEMO_CUSTOMER_ID).map((w) => w.storeId))
  let changed = false
  demoStores.forEach((storeId) => {
    const queue = activeQueue(storeId)
    const head = queue[0]
    if (!head) return
    if (head.memberId === DEMO_CUSTOMER_ID) {
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
    queueChanged(storeId)
  })
  if (changed) persist()
}

export function callWaiting(w: WaitingRow) {
  const store = findStore(w.storeId)!
  const current = now()
  w.callCount = (w.callCount ?? (w.calledAt ? 1 : 0)) + 1
  w.status = 'CALLED'
  w.calledAt = toIso(current)
  w.callExpiresAt = toIso(current.add(store.waitingSettings.arrivalLimitMinutes, 'minute'))
  w.respondedAt = null
  w.updatedAt = w.calledAt
  notify(
    w.memberId,
    'WAITING_CALLED',
    w.waitingId,
    `${store.name} 입장 차례예요. ${store.waitingSettings.arrivalLimitMinutes}분 안에 도착을 알려주세요`,
    { status: w.status, waitNumber: w.waitNumber, storeName: store.name, calledAt: w.calledAt, expiresAt: w.callExpiresAt },
  )
  queueChanged(w.storeId)
}

/* ------------------------------------------------------------------ */
/* 응답 변환                                                             */
/* ------------------------------------------------------------------ */

export const toStore = (row: StoreRow): Store => ({
  id: row.id,
  name: row.name,
  category: row.category,
  categoryName: STORE_CATEGORY_LABEL[row.category],
  address: row.address,
  waitingAvailable: row.waitingAvailable && row.waitingSettings.open,
})

export const toStoreDetail = (row: StoreRow): StoreDetail => ({
  ...toStore(row),
  reservationEnabled: row.ownerId != null,
  description: row.description ?? null,
  phone: row.phone ?? null,
  imageUrl: row.imageUrl ?? null,
  businessHours: row.businessHours,
  menus: db.menus.filter((m) => m.storeId === row.id).map(({ storeId: _s, ...menu }) => menu),
})

export function toReservation(r: ReservationRow): Reservation {
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
  }
}

export function toOwnerReservation(r: ReservationRow): OwnerReservation {
  const member = findMember(r.memberId)
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
  }
}

/** GET /api/user/waitings/{id} — WaitingPositionResponse */
export function toWaiting(w: WaitingRow): Waiting {
  const active = ACTIVE_WAITING_STATUSES.includes(w.status)
  const ahead = active ? teamsAhead(w) : null
  return {
    waitingId: w.waitingId,
    storeId: w.storeId,
    storeName: findStore(w.storeId)?.name ?? '',
    waitingDate: dayjs(w.createdAt).format('YYYY-MM-DD'),
    waitNumber: w.waitNumber,
    currentPosition: ahead == null ? null : ahead + 1,
    teamsAhead: ahead,
    partyCount: w.partyCount,
    status: w.status,
    calledAt: active ? w.calledAt : null,
    expiresAt: active ? w.callExpiresAt : null,
    respondedAt: active ? w.respondedAt ?? null : null,
    arrivalIntent: active && w.respondedAt ? 'COMING' : null,
  }
}

/** POST /api/user/waitings — WaitingResponse */
export const toWaitingRegistration = (w: WaitingRow): WaitingRegistration => ({
  waitingId: w.waitingId,
  storeId: w.storeId,
  waitNumber: w.waitNumber,
  partyCount: w.partyCount,
  status: w.status,
  teamsAhead: teamsAhead(w),
})

/** WaitingTerminationResponse */
export const toWaitingTermination = (w: WaitingRow): WaitingTermination => ({
  waitingId: w.waitingId,
  status: w.status,
  reason: w.endReason ?? 'CUSTOMER_CANCELED',
  detail: w.endDetail ?? null,
  endedAt: w.endedAt ?? w.updatedAt,
})

/** GET /api/owner/stores/{storeId}/waitings — OwnerWaitingResponse */
export function toOwnerWaiting(w: WaitingRow): OwnerWaiting {
  const member = findMember(w.memberId)
  return {
    id: w.waitingId,
    storeId: w.storeId,
    storeName: findStore(w.storeId)?.name ?? '',
    waitingNumber: w.waitNumber,
    partySize: w.partyCount,
    status: w.status,
    customerName: member?.name ?? '',
    createdAt: w.createdAt,
    compatibleTables: storeTables(w.storeId)
      .filter((t) => fits(t, w.partyCount))
      .map(({ id, tableNumber, minCapacity, capacity, status }) => ({ id, tableNumber, minCapacity, capacity, status })),
    calledAt: w.calledAt,
    callExpiresAt: w.callExpiresAt,
    respondedAt: w.respondedAt ?? null,
    arrivalIntent: w.respondedAt ? 'COMING' : null,
  }
}

/** 예약·웨이팅 내역 — HistoryItemResponse */
export function reservationHistoryItem(r: ReservationRow): HistoryItem {
  return {
    type: 'RESERVATION',
    id: r.reservationId,
    storeId: r.storeId,
    storeName: findStore(r.storeId)?.name ?? '',
    status: r.status,
    active: r.status === 'PENDING_PAYMENT' || r.status === 'CONFIRMED',
    partySize: r.partySize,
    reservationStartAt: r.reservationStartAt,
    reservationEndAt: r.reservationEndAt,
    waitingDate: null,
    waitNumber: null,
    requestedAt: r.requestedAt,
  }
}

export function waitingHistoryItem(w: WaitingRow): HistoryItem {
  return {
    type: 'WAITING',
    id: w.waitingId,
    storeId: w.storeId,
    storeName: findStore(w.storeId)?.name ?? '',
    status: w.status,
    active: ACTIVE_WAITING_STATUSES.includes(w.status),
    partySize: w.partyCount,
    reservationStartAt: null,
    reservationEndAt: null,
    waitingDate: dayjs(w.createdAt).format('YYYY-MM-DD'),
    waitNumber: w.waitNumber,
    requestedAt: w.createdAt,
  }
}

/** 매장 리뷰 — StoreReviewResponse */
export const toStoreReview = (r: ReviewRow): StoreReview => ({
  reviewId: r.reviewId,
  writerName: maskName(findMember(r.memberId)?.name ?? '고객'),
  rating: r.rating,
  content: r.content,
  imageUrl: r.imageUrl,
  createdAt: r.createdAt,
})

/** 내 리뷰 — MyReviewResponse */
export function toMyReview(r: ReviewRow): MyReview {
  const visit = db.reservations.find((x) => x.reservationId === r.reservationId)
  return {
    reviewId: r.reviewId,
    storeId: r.storeId,
    storeName: findStore(r.storeId)?.name ?? '',
    visitedAt: visit?.reservationStartAt ?? r.createdAt,
    rating: r.rating,
    content: r.content,
    imageUrl: r.imageUrl,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
}

/** 페이지 자르기 — 백엔드 목록 응답(page·size·hasNext) 형식 */
export function paginate<T>(items: T[], url: URL, defaultSize = 20) {
  const page = Math.max(0, Number(url.searchParams.get('page') ?? 0))
  const size = Math.max(1, Number(url.searchParams.get('size') ?? defaultSize))
  return { items: items.slice(page * size, page * size + size), page, size, hasNext: (page + 1) * size < items.length }
}

/** 리뷰 작성자 이름 가리기 — 김캐치 → 김*치 */
const maskName = (name: string) => (name.length <= 2 ? `${name[0]}*` : `${name[0]}${'*'.repeat(name.length - 2)}${name[name.length - 1]}`)
