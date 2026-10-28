import { http, HttpResponse } from 'msw'
import type { TableType } from '@/entities'
import { isFeatureAvailable } from '@/shared/config'
import { dayjs } from '@/shared/lib/dayjs'
import { db, nextId, type HoldRow, type ReservationRow } from '../db'
import {
  findStore,
  freeTables,
  notify,
  nowIso,
  reservationHistoryItem,
  toIso,
  toReservation,
  validateBookable,
  waitingHistoryItem,
  type BookableError,
} from '../logic'
import { API, badRequest, before, body, conflict, fail, memberIdOf, notFound, saved, unauthorized } from '../utils'

const BOOKABLE_MESSAGE: Record<BookableError, string> = {
  BOOKING_NOT_OPEN_YET: '아직 예약을 받지 않는 날짜입니다.',
  BOOKING_DEADLINE_PASSED: '예약 마감 시간이 지났습니다.',
  OUTSIDE_BUSINESS_HOURS: '영업시간이 아닌 시간입니다.',
}

const reservationNotFound = () => notFound('RESERVATION_NOT_FOUND', '예약을 찾을 수 없습니다.')

/** 예약 확정 레코드 생성 + 확정 알림 */
export function createConfirmedReservation(args: {
  memberId: number
  storeId: number
  tableId: number
  startAt: dayjs.Dayjs
  partySize: number
  request?: string | null
  paymentId?: number | null
  /** 선점에서 넘어온 경우 같은 id 사용 (백엔드: holdId == reservationId) */
  reservationId?: number
}): ReservationRow {
  const store = findStore(args.storeId)!
  const at = nowIso()
  const row: ReservationRow = {
    reservationId: args.reservationId ?? nextId('reservation'),
    storeId: args.storeId,
    memberId: args.memberId,
    tableId: args.tableId,
    reservationStartAt: toIso(args.startAt),
    reservationEndAt: toIso(args.startAt.add(store.policy.reservationDurationMinutes, 'minute')),
    partySize: args.partySize,
    status: 'CONFIRMED',
    requestedAt: at,
    confirmedAt: at,
    checkedInAt: null,
    checkedInByMemberId: null,
    completedAt: null,
    cancelledAt: null,
    cancellationActor: null,
    cancellationReason: null,
    noShowAt: null,
    noShowByMemberId: null,
    noShowReason: null,
    request: args.request ?? null,
    paymentId: args.paymentId ?? null,
  }
  db.reservations.push(row)
  notify(
    args.memberId,
    'RESERVATION_CONFIRMED',
    row.reservationId,
    '예약이 확정됐어요',
    `${store.name} · ${args.startAt.format('M/D(dd) HH:mm')} · ${args.partySize}명`,
  )
  return row
}

/** 예약 가능 여부 + 배정할 테이블 — 실패 시 오류 응답 */
export function pickTable(storeId: number, startAtIso: string | undefined, partySize: number | undefined, preferredType?: TableType) {
  const store = findStore(storeId)
  if (!store) return { error: notFound('STORE_NOT_FOUND', '매장을 찾을 수 없습니다') }
  if (!startAtIso || !partySize || partySize < 1) return { error: badRequest('예약 시각과 인원은 필수입니다.') }
  const startAt = dayjs(startAtIso)
  const invalid = validateBookable(store, startAt)
  if (invalid) return { error: badRequest(BOOKABLE_MESSAGE[invalid], invalid) }
  const [table] = freeTables(store, startAt, partySize, { preferredType })
  if (!table) return { error: conflict('NO_AVAILABLE_TABLE', '선택한 시간에 배정 가능한 테이블이 없습니다.') }
  return { store, startAt, table }
}

/** 고객 예약 API — 백엔드 dev ReservationController + 노션 MOCK 계약 초안 */
export const reservationHandlers = [
  http.post(`${API}/user/reservations`, async ({ request }) => {
    await before()
    const memberId = memberIdOf(request)
    if (!memberId) return unauthorized()
    const b = await body<{ storeId: number; reservationStartAt: string; partySize: number; preferredTableType?: TableType; request?: string }>(request)
    const picked = pickTable(Number(b.storeId), b.reservationStartAt, b.partySize, b.preferredTableType)
    if ('error' in picked) return picked.error
    // [목 전용] 예약금 매장은 선점 → 결제로만 예약 (백엔드 dev 는 예약금 개념이 없어 바로 생성)
    if (isFeatureAvailable('depositPayment') && (picked.store.depositAmount ?? 0) > 0) {
      return fail(402, 'DEPOSIT_REQUIRED', '예약금이 있는 매장은 테이블 선점 후 결제해야 합니다.')
    }
    const row = createConfirmedReservation({
      memberId,
      storeId: picked.store.id,
      tableId: picked.table.id,
      startAt: picked.startAt,
      partySize: b.partySize!,
      request: b.request,
    })
    return saved(HttpResponse.json(toReservation(row), { status: 201 }))
  }),

  /**
   * 예약·웨이팅 내역 — HistoryController (?type=RESERVATION|WAITING&status=ACTIVE|ENDED, 없으면 전체)
   * 진행 중 먼저(가까운 순), 종료는 최신순. 정렬 기준: 예약은 방문 시각, 웨이팅은 신청 시각
   */
  http.get(`${API}/user/reservations`, async ({ request }) => {
    await before()
    const memberId = memberIdOf(request)
    if (!memberId) return unauthorized()
    const q = new URL(request.url).searchParams
    const type = q.get('type')
    const status = q.get('status')
    const items = [
      ...(type !== 'WAITING' ? db.reservations.filter((r) => r.memberId === memberId).map(reservationHistoryItem) : []),
      ...(type !== 'RESERVATION' ? db.waitings.filter((w) => w.memberId === memberId).map(waitingHistoryItem) : []),
    ].filter((item) => !status || item.active === (status === 'ACTIVE'))
    const sortAt = (i: (typeof items)[number]) => (i.type === 'RESERVATION' ? i.reservationStartAt! : i.requestedAt)
    items.sort((a, b) =>
      a.active !== b.active ? (a.active ? -1 : 1) : a.active ? sortAt(a).localeCompare(sortAt(b)) : sortAt(b).localeCompare(sortAt(a)),
    )
    return HttpResponse.json(items)
  }),

  /* ---------- P2: 선점 (holds 가 :reservationId 보다 먼저 매칭되도록 위에 둠) ---------- */
  http.post(`${API}/user/reservations/holds`, async ({ request }) => {
    await before()
    const memberId = memberIdOf(request)
    if (!memberId) return unauthorized()
    const b = await body<{ storeId: number; reservationStartAt: string; partySize: number; preferredTableType?: TableType }>(request)
    const picked = pickTable(Number(b.storeId), b.reservationStartAt, b.partySize, b.preferredTableType)
    if ('error' in picked) return picked.error
    const createdAt = dayjs()
    // 백엔드처럼 선점 id == 예약 id
    const id = nextId('reservation')
    const hold: HoldRow = {
      holdId: id,
      reservationId: id,
      memberId,
      storeId: picked.store.id,
      tableId: picked.table.id,
      reservationStartAt: toIso(picked.startAt),
      reservationEndAt: toIso(picked.startAt.add(picked.store.policy.reservationDurationMinutes, 'minute')),
      partySize: b.partySize!,
      depositAmount: (picked.store.depositAmount ?? 0) * b.partySize!,
      status: 'PENDING_PAYMENT',
      createdAt: toIso(createdAt),
      expiresAt: toIso(createdAt.add(5, 'minute')),
    }
    db.holds.push(hold)
    return saved(HttpResponse.json(presentHold(hold), { status: 201 }))
  }),

  http.get(`${API}/user/reservations/holds/:holdId`, async ({ params, request }) => {
    await before()
    const hold = db.holds.find((h) => h.holdId === Number(params.holdId) && h.memberId === memberIdOf(request))
    return hold ? HttpResponse.json(presentHold(hold)) : notFound('HOLD_NOT_FOUND', '선점 정보를 찾을 수 없습니다.')
  }),

  http.delete(`${API}/user/reservations/holds/:holdId`, async ({ params, request }) => {
    await before()
    const hold = db.holds.find((h) => h.holdId === Number(params.holdId) && h.memberId === memberIdOf(request))
    if (!hold) return notFound('HOLD_NOT_FOUND', '선점 정보를 찾을 수 없습니다.')
    if (hold.status === 'PENDING_PAYMENT') hold.status = 'CANCELLED'
    return saved(new HttpResponse(null, { status: 204 }))
  }),

  http.get(`${API}/user/reservations/:reservationId`, async ({ params, request }) => {
    await before()
    const r = db.reservations.find((x) => x.reservationId === Number(params.reservationId))
    if (!r || r.memberId !== memberIdOf(request)) return reservationNotFound()
    return HttpResponse.json(toReservation(r))
  }),

  /** 고객 취소 — 시작 전·미방문 확정 예약만, 재취소는 기존 결과 */
  http.post(`${API}/user/reservations/:reservationId/cancel`, async ({ params, request }) => {
    await before()
    const r = db.reservations.find((x) => x.reservationId === Number(params.reservationId))
    if (!r || r.memberId !== memberIdOf(request)) return reservationNotFound()
    if (r.status === 'CANCELLED') return HttpResponse.json(toReservation(r))
    if (r.status !== 'CONFIRMED' || r.checkedInAt || !dayjs(r.reservationStartAt).isAfter(dayjs())) {
      return conflict('RESERVATION_NOT_CANCELLABLE', '취소할 수 없는 예약입니다.')
    }
    r.status = 'CANCELLED'
    r.cancelledAt = nowIso()
    r.cancellationActor = 'CUSTOMER'
    // P2: 예약금 환불
    const payment = db.payments.find((p) => p.paymentId === r.paymentId)
    if (payment) {
      const refund = refundOf(r).refundAmount
      payment.canceledAmount = refund
      payment.status = refund >= payment.amount ? 'REFUNDED' : refund > 0 ? 'PARTIAL_REFUNDED' : payment.status
    }
    notify(r.memberId, 'RESERVATION_CANCELED', r.reservationId, '예약이 취소됐어요', `${findStore(r.storeId)?.name} 예약을 취소했어요`)
    return saved(HttpResponse.json(toReservation(r)))
  }),

  /** [목 전용] 환불 예상액 */
  http.get(`${API}/user/reservations/:reservationId/refund-preview`, async ({ params, request }) => {
    await before()
    const r = db.reservations.find((x) => x.reservationId === Number(params.reservationId))
    if (!r || r.memberId !== memberIdOf(request)) return reservationNotFound()
    return HttpResponse.json(refundOf(r))
  }),
]

/** ReservationHoldResponse (+ [목 전용] depositAmount) */
function presentHold(h: HoldRow) {
  const { memberId: _m, createdAt: _c, ...rest } = h
  const remaining = Math.max(0, dayjs(h.expiresAt).diff(dayjs(), 'second'))
  return { ...rest, serverTime: nowIso(), remainingSeconds: h.status === 'PENDING_PAYMENT' ? remaining : 0 }
}

/** 환불 규정 — 방문 1일 전까지 100%, 당일 50%, 시작 이후 0% */
export function refundOf(r: ReservationRow) {
  const paid = db.payments.find((p) => p.paymentId === r.paymentId)?.amount ?? 0
  const hoursLeft = dayjs(r.reservationStartAt).diff(dayjs(), 'hour', true)
  const rate = hoursLeft >= 24 ? 100 : hoursLeft > 0 ? 50 : 0
  return {
    reservationId: r.reservationId,
    paidAmount: paid,
    refundAmount: Math.floor((paid * rate) / 100),
    refundRate: rate,
    policyDescription: '방문 1일 전까지 전액, 당일 취소 50%, 예약 시각 이후 환불 불가',
  }
}
