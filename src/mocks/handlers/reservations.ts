import { http, HttpResponse } from 'msw'
import { dayjs } from '@/shared/lib/dayjs'
import { db, nextId, type ReservationRow } from '../db'
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
import { API, badRequest, before, body, conflict, memberIdOf, notFound, saved, unauthorized } from '../utils'

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
}): ReservationRow {
  const store = findStore(args.storeId)!
  const at = nowIso()
  const row: ReservationRow = {
    reservationId: nextId('reservation'),
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
  }
  db.reservations.push(row)
  notify(
    args.memberId,
    'RESERVATION_CONFIRMED',
    row.reservationId,
    `${store.name} ${args.startAt.format('M/D(dd) HH:mm')}, ${args.partySize}명`,
  )
  return row
}

/** 예약 가능 여부 + 배정할 테이블 — 실패 시 오류 응답 */
export function pickTable(storeId: number, startAtIso: string | undefined, partySize: number | undefined) {
  const store = findStore(storeId)
  if (!store || store.ownerId == null) return { error: notFound('STORE_NOT_FOUND', '매장을 찾을 수 없습니다') }
  if (!startAtIso || !partySize || partySize < 1) return { error: badRequest('예약 시각과 인원은 필수입니다.') }
  const startAt = dayjs(startAtIso)
  const invalid = validateBookable(store, startAt)
  if (invalid) return { error: badRequest(BOOKABLE_MESSAGE[invalid], invalid) }
  const [table] = freeTables(store, startAt, partySize)
  if (!table) return { error: conflict('HTTP_409', '예약 가능한 테이블이 없습니다.') }
  return { store, startAt, table }
}

/** 고객 예약 API — 백엔드 dev ReservationController · HistoryController */
export const reservationHandlers = [
  http.post(`${API}/user/reservations`, async ({ request }) => {
    await before()
    const memberId = memberIdOf(request)
    if (!memberId) return unauthorized()
    const b = await body<{ storeId: number; reservationStartAt: string; partySize: number }>(request)
    const picked = pickTable(Number(b.storeId), b.reservationStartAt, b.partySize)
    if ('error' in picked) return picked.error
    const row = createConfirmedReservation({
      memberId,
      storeId: picked.store.id,
      tableId: picked.table.id,
      startAt: picked.startAt,
      partySize: b.partySize!,
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
    notify(r.memberId, 'RESERVATION_CANCELED', r.reservationId, `${findStore(r.storeId)?.name} 예약을 취소했어요`)
    return saved(HttpResponse.json(toReservation(r)))
  }),
]
