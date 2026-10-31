import { http, HttpResponse, sse } from 'msw'
import type { BusinessHour, DayOfWeek, ReservationPolicy, ReservationStatus, TableStatus, WaitingSettings } from '@/entities'
import { ACTIVE_WAITING_STATUSES } from '@/entities'
import { dayjs } from '@/shared/lib/dayjs'
import { db, nextId, type StoreRow } from '../db'
import {
  activeQueue,
  callWaiting,
  endWaiting,
  findStore,
  freeTables,
  notify,
  nowIso,
  queueChanged,
  storeTables,
  subscribeOwner,
  toIso,
  toOwnerReservation,
  toOwnerWaiting,
  toWaitingTermination,
  validateBookable,
} from '../logic'
import { API, badRequest, before, body, conflict, fail, memberIdOf, notFound, saved, unauthorized } from '../utils'

/** 점주 본인 매장인지 확인 — 아니면 오류 응답 */
function ownStore(request: Request, storeId: number): { store: StoreRow } | { error: Response } {
  const memberId = memberIdOf(request)
  if (!memberId) return { error: unauthorized() }
  const store = findStore(storeId)
  if (!store || store.ownerId == null) return { error: notFound('STORE_NOT_FOUND', '매장을 찾을 수 없습니다') }
  if (store.ownerId !== memberId) return { error: fail(403, 'FORBIDDEN_MEMBER_TYPE', '이 기능을 사용할 수 없는 회원 유형입니다.') }
  return { store }
}

const presentTable = ({ storeId: _s, ...t }: (typeof db.tables)[number]) => t
/** MenuCreateRequest · MenuUpdateRequest */
type MenuBody = { name: string; price: number; description: string }
const presentMenu = ({ storeId: _s, ...m }: (typeof db.menus)[number]) => m
const timeOk = (v: unknown) => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d(?::00)?$/.test(v)
const withSeconds = (v: string) => (v.length === 5 ? `${v}:00` : v)

/* ================================================================== */
/* 테이블 · 영업시간 · 예약 정책 · 메뉴                                    */
/* ================================================================== */
const storeHandlers = [
  /* ---------- 테이블 (백엔드 dev 구현) ---------- */
  http.get(`${API}/owner/stores/:storeId/tables`, async ({ params, request }) => {
    await before()
    const own = ownStore(request, Number(params.storeId))
    if ('error' in own) return own.error
    return HttpResponse.json(
      storeTables(own.store.id)
        .sort((a, b) => a.tableNumber - b.tableNumber)
        .map(presentTable),
    )
  }),

  http.post(`${API}/owner/stores/:storeId/tables`, async ({ params, request }) => {
    await before()
    const own = ownStore(request, Number(params.storeId))
    if ('error' in own) return own.error
    const b = await body<{ tableNumber: number; minCapacity: number; capacity: number }>(request)
    const minCapacity = b.minCapacity ?? 1
    if (!b.tableNumber || !b.capacity) return badRequest('테이블 번호와 최대 인원은 필수입니다.')
    if (minCapacity < 1 || minCapacity > b.capacity) {
      return badRequest('최소 인원은 1명 이상이고 최대 인원 이하여야 합니다.', 'INVALID_TABLE_CAPACITY')
    }
    if (storeTables(own.store.id).some((t) => t.tableNumber === b.tableNumber)) {
      return conflict('DUPLICATE_TABLE_NUMBER', '이미 사용 중인 테이블 번호입니다.')
    }
    const row = {
      id: nextId('table'),
      storeId: own.store.id,
      tableNumber: b.tableNumber,
      minCapacity,
      capacity: b.capacity,
      status: 'ACTIVE' as const,
    }
    db.tables.push(row)
    return saved(HttpResponse.json(presentTable(row), { status: 201 }))
  }),

  http.patch(`${API}/owner/stores/:storeId/tables/:tableId`, async ({ params, request }) => {
    await before()
    const own = ownStore(request, Number(params.storeId))
    if ('error' in own) return own.error
    const table = storeTables(own.store.id).find((t) => t.id === Number(params.tableId))
    if (!table) return notFound('TABLE_NOT_FOUND', '테이블을 찾을 수 없습니다')
    // StoreTableUpdateRequest — 운영 상태만 변경
    const b = await body<{ status: TableStatus }>(request)
    if (b.status !== 'ACTIVE' && b.status !== 'INACTIVE') return badRequest('테이블 상태를 확인해주세요.')
    const next = { ...table, status: b.status }
    // 앞으로의 확정 예약과 충돌하면 거절 (백엔드 TABLE_HAS_RESERVATIONS)
    const futureOnTable = db.reservations.filter(
      (r) => r.tableId === table.id && r.status === 'CONFIRMED' && !r.checkedInAt && dayjs(r.reservationEndAt).isAfter(dayjs()),
    )
    const breaks = futureOnTable.some((r) => next.status === 'INACTIVE' || r.partySize < next.minCapacity || r.partySize > next.capacity)
    if (breaks) return conflict('TABLE_HAS_RESERVATIONS', '변경한 테이블 조건과 충돌하는 예약이 있습니다.')
    Object.assign(table, next)
    return saved(HttpResponse.json(presentTable(table)))
  }),

  /* ---------- 영업시간 (백엔드 dev 구현) ---------- */
  http.get(`${API}/owner/stores/:storeId/business-hours`, async ({ params, request }) => {
    await before()
    const own = ownStore(request, Number(params.storeId))
    if ('error' in own) return own.error
    return HttpResponse.json(own.store.businessHours)
  }),

  http.put(`${API}/owner/stores/:storeId/business-hours`, async ({ params, request }) => {
    await before()
    const own = ownStore(request, Number(params.storeId))
    if ('error' in own) return own.error
    const b = await body<{
      businessHours: (Omit<BusinessHour, 'breakStartTime' | 'breakEndTime'> & {
        breakStartTime?: string | null
        breakEndTime?: string | null
      })[]
    }>(request)
    if (!Array.isArray(b.businessHours)) return badRequest('businessHours 는 필수입니다.')
    const days = new Set<DayOfWeek>()
    for (const h of b.businessHours) {
      if (days.has(h.dayOfWeek)) return badRequest('같은 요일의 영업시간이 중복되었습니다.', 'DUPLICATE_BUSINESS_DAY')
      days.add(h.dayOfWeek)
      if (!timeOk(h.openTime) || !timeOk(h.closingTime))
        return badRequest('영업시간은 분 단위로 입력해야 합니다.', 'INVALID_BUSINESS_HOUR_PRECISION')
      if (withSeconds(h.openTime) === withSeconds(h.closingTime)) {
        return badRequest('영업 시작 시각과 종료 시각이 같을 수 없습니다.', 'INVALID_BUSINESS_HOUR')
      }
      if (!!h.breakStartTime !== !!h.breakEndTime) {
        return badRequest('브레이크타임은 시작과 종료를 함께 입력하고 영업시간 안에 있어야 합니다.', 'INVALID_BREAK_TIME')
      }
      if (h.breakStartTime && h.breakEndTime) {
        if (!timeOk(h.breakStartTime) || !timeOk(h.breakEndTime)) {
          return badRequest('브레이크타임은 분 단위로 입력해야 합니다.', 'INVALID_BUSINESS_HOUR_PRECISION')
        }
        const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))
        const open = minutes(h.openTime)
        const offset = (time: string) => minutes(time) + (minutes(time) < open ? 1440 : 0)
        if (!(open < offset(h.breakStartTime) && offset(h.breakStartTime) < offset(h.breakEndTime)
          && offset(h.breakEndTime) < offset(h.closingTime))) {
          return badRequest('브레이크타임은 영업 구간 안에 있어야 합니다.', 'INVALID_BREAK_TIME')
        }
      }
    }
    own.store.businessHours = b.businessHours.map((h) => ({
      dayOfWeek: h.dayOfWeek,
      openTime: withSeconds(h.openTime),
      closingTime: withSeconds(h.closingTime),
      breakStartTime: h.breakStartTime ? withSeconds(h.breakStartTime) : null,
      breakEndTime: h.breakEndTime ? withSeconds(h.breakEndTime) : null,
    }))
    return saved(HttpResponse.json(own.store.businessHours))
  }),

  /* ---------- 예약 정책 (백엔드 dev 구현) ---------- */
  http.get(`${API}/owner/stores/:storeId/reservation-policy`, async ({ params, request }) => {
    await before()
    const own = ownStore(request, Number(params.storeId))
    if ('error' in own) return own.error
    return HttpResponse.json(own.store.policy)
  }),

  http.put(`${API}/owner/stores/:storeId/reservation-policy`, async ({ params, request }) => {
    await before()
    const own = ownStore(request, Number(params.storeId))
    if ('error' in own) return own.error
    const b = await body<ReservationPolicy>(request)
    const keys: (keyof ReservationPolicy)[] = [
      'reservationDurationMinutes',
      'reservationSlotMinutes',
      'arrivalGraceMinutes',
      'bookingOpenDays',
      'bookingDeadlineMinutes',
    ]
    if (keys.some((k) => typeof b[k] !== 'number' || b[k]! < 0)) return badRequest('예약 정책 값을 모두 입력해주세요.')
    if (b.arrivalGraceMinutes! >= b.reservationDurationMinutes!) {
      return badRequest('도착 유예시간은 이용시간보다 짧아야 합니다.', 'INVALID_RESERVATION_POLICY')
    }
    own.store.policy = b as ReservationPolicy
    return saved(HttpResponse.json(own.store.policy))
  }),

  /* ---------- 메뉴 (등록·수정) ---------- */
  http.post(`${API}/owner/stores/:storeId/menus`, async ({ params, request }) => {
    await before()
    const own = ownStore(request, Number(params.storeId))
    if ('error' in own) return own.error
    const b = await body<MenuBody>(request)
    if (!b.name?.trim() || b.name.length > 100) return badRequest('메뉴 이름을 확인해주세요.')
    if (typeof b.price !== 'number' || b.price < 0) return badRequest('가격은 0원 이상이어야 합니다.')
    const row = {
      id: nextId('menu'),
      storeId: own.store.id,
      name: b.name.trim(),
      price: b.price,
      description: b.description?.trim() || null,
    }
    db.menus.push(row)
    return saved(HttpResponse.json(presentMenu(row), { status: 201 }))
  }),

  http.patch(`${API}/owner/stores/:storeId/menus/:menuId`, async ({ params, request }) => {
    await before()
    const own = ownStore(request, Number(params.storeId))
    if ('error' in own) return own.error
    const menu = db.menus.find((m) => m.storeId === own.store.id && m.id === Number(params.menuId))
    if (!menu) return notFound('MENU_NOT_FOUND', '메뉴를 찾을 수 없습니다.')
    const b = await body<MenuBody>(request)
    if (b.name !== undefined && !b.name.trim()) return badRequest('메뉴 이름을 확인해주세요.')
    if (b.price !== undefined && b.price < 0) return badRequest('가격은 0원 이상이어야 합니다.')
    if (b.name !== undefined) menu.name = b.name.trim()
    if (b.price !== undefined) menu.price = b.price
    if (b.description !== undefined) menu.description = b.description.trim() || null
    return saved(HttpResponse.json(presentMenu(menu)))
  }),
]

/* ================================================================== */
/* 예약 운영 (백엔드 dev OwnerReservationController)                     */
/* ================================================================== */
const reservationHandlers = [
  http.get(`${API}/owner/stores/:storeId/reservations`, async ({ params, request }) => {
    await before()
    const own = ownStore(request, Number(params.storeId))
    if ('error' in own) return own.error
    const q = new URL(request.url).searchParams
    const date = q.get('date')
    const status = q.get('status') as ReservationStatus | null
    if (!date) return badRequest('date 는 필수입니다.')
    const list = db.reservations
      .filter((r) => r.storeId === own.store.id && dayjs(r.reservationStartAt).format('YYYY-MM-DD') === date)
      .filter((r) => !status || r.status === status)
      .sort((a, b) => a.reservationStartAt.localeCompare(b.reservationStartAt))
    return HttpResponse.json(list.map(toOwnerReservation))
  }),

  http.post(`${API}/owner/reservations/:reservationId/cancel`, async ({ params, request }) => {
    await before()
    const r = db.reservations.find((x) => x.reservationId === Number(params.reservationId))
    if (!r) return notFound('RESERVATION_NOT_FOUND', '예약을 찾을 수 없습니다.')
    const own = ownStore(request, r.storeId)
    if ('error' in own) return own.error
    const { reason } = await body<{ reason: string }>(request)
    if (!reason?.trim()) return badRequest('취소 사유를 입력해주세요.')
    if (r.status === 'CANCELLED') return HttpResponse.json(toOwnerReservation(r))
    if (r.status !== 'CONFIRMED' || r.checkedInAt) return conflict('RESERVATION_NOT_CANCELLABLE', '취소할 수 없는 예약입니다.')
    r.status = 'CANCELLED'
    r.cancelledAt = nowIso()
    r.cancellationActor = 'OWNER'
    r.cancellationReason = reason.trim()
    notify(r.memberId, 'RESERVATION_CANCELED', r.reservationId, `${own.store.name} 사정으로 예약이 취소됐어요. 사유: ${reason.trim()}`)
    return saved(HttpResponse.json(toOwnerReservation(r)))
  }),

  /** 방문 확인 — checkedInAt 기록, 상태는 CONFIRMED 유지 */
  http.post(`${API}/owner/reservations/:reservationId/enter`, async ({ params, request }) => {
    await before()
    const r = db.reservations.find((x) => x.reservationId === Number(params.reservationId))
    if (!r) return notFound('RESERVATION_NOT_FOUND', '예약을 찾을 수 없습니다.')
    const own = ownStore(request, r.storeId)
    if ('error' in own) return own.error
    if (r.checkedInAt) return HttpResponse.json(toOwnerReservation(r))
    if (r.status !== 'CONFIRMED') return conflict('RESERVATION_NOT_ENTERABLE', '방문 확인을 할 수 없는 예약입니다.')
    r.checkedInAt = nowIso()
    r.checkedInByMemberId = own.store.ownerId
    return saved(HttpResponse.json(toOwnerReservation(r)))
  }),

  /** 노쇼 — 미방문 확정 예약 + 예약 시각 + 도착 유예시간 이후만 */
  http.post(`${API}/owner/reservations/:reservationId/no-show`, async ({ params, request }) => {
    await before()
    const r = db.reservations.find((x) => x.reservationId === Number(params.reservationId))
    if (!r) return notFound('RESERVATION_NOT_FOUND', '예약을 찾을 수 없습니다.')
    const own = ownStore(request, r.storeId)
    if ('error' in own) return own.error
    const { reason } = await body<{ reason: string }>(request)
    if (!reason?.trim()) return badRequest('노쇼 사유를 입력해주세요.')
    if (r.status === 'NO_SHOW') return HttpResponse.json(toOwnerReservation(r))
    const graceEnd = dayjs(r.reservationStartAt).add(own.store.policy.arrivalGraceMinutes, 'minute')
    if (r.status !== 'CONFIRMED' || r.checkedInAt || dayjs().isBefore(graceEnd)) {
      return conflict('RESERVATION_NOT_NO_SHOW', '노쇼 처리할 수 없는 예약입니다.')
    }
    r.status = 'NO_SHOW'
    r.noShowAt = nowIso()
    r.noShowByMemberId = own.store.ownerId
    r.noShowReason = reason.trim()
    return saved(HttpResponse.json(toOwnerReservation(r)))
  }),

  /** 예약 변경 — 시각·인원 변경 시 테이블 재배정 */
  http.patch(`${API}/owner/reservations/:reservationId`, async ({ params, request }) => {
    await before()
    const r = db.reservations.find((x) => x.reservationId === Number(params.reservationId))
    if (!r) return notFound('RESERVATION_NOT_FOUND', '예약을 찾을 수 없습니다.')
    const own = ownStore(request, r.storeId)
    if ('error' in own) return own.error
    if (r.status !== 'CONFIRMED' || r.checkedInAt) return conflict('RESERVATION_NOT_CHANGEABLE', '변경할 수 없는 예약입니다.')
    const b = await body<{ reservationStartAt: string; partySize: number; tableId: number }>(request)
    const startAt = dayjs(b.reservationStartAt ?? r.reservationStartAt)
    const partySize = b.partySize ?? r.partySize
    if (validateBookable(own.store, startAt) === 'OUTSIDE_BUSINESS_HOURS') return badRequest('영업시간이 아닌 시간입니다.')
    const candidates = freeTables(own.store, startAt, partySize, { excludeReservationId: r.reservationId })
    const table = b.tableId ? candidates.find((t) => t.id === b.tableId) : candidates[0]
    if (!table) return conflict('NO_AVAILABLE_TABLE', '변경한 시간에 배정 가능한 테이블이 없습니다.')
    r.reservationStartAt = toIso(startAt)
    r.reservationEndAt = toIso(startAt.add(own.store.policy.reservationDurationMinutes, 'minute'))
    r.partySize = partySize
    r.tableId = table.id
    notify(
      r.memberId,
      'RESERVATION_CHANGED',
      r.reservationId,
      `${own.store.name} 예약이 ${startAt.format('M/D(dd) HH:mm')}, ${partySize}명으로 변경됐어요`,
    )
    return saved(HttpResponse.json(toOwnerReservation(r)))
  }),
]

/* ================================================================== */
/* 웨이팅 운영 (백엔드 dev OwnerWaitingController)                      */
/* ================================================================== */
function ownWaiting(request: Request, waitingId: number) {
  const w = db.waitings.find((x) => x.waitingId === waitingId)
  if (!w) return { error: notFound('WAITING_NOT_FOUND', '웨이팅을 찾을 수 없습니다.') }
  const own = ownStore(request, w.storeId)
  if ('error' in own) return { error: own.error }
  return { w, store: own.store }
}

/** WaitingPolicyResponse */
const presentSettings = (store: StoreRow) => ({ storeId: store.id, ...store.waitingSettings })

/** WaitingCallResponse */
const callResult = (w: (typeof db.waitings)[number]) => ({
  waitingId: w.waitingId,
  status: w.status,
  waitNumber: w.waitNumber,
  callCount: w.callCount ?? 0,
  calledAt: w.calledAt,
  expiresAt: w.callExpiresAt,
})

const waitingHandlers = [
  /**
   * 점주 실시간 구독 — GET /api/owner/stores/{storeId}/waitings/subscribe?memberId=
   * 연결 직후 "connect", 이후 대기 목록이 바뀔 때마다 WAITING_CHANGED (targetId = 매장 id)
   * (/settings·/open 보다 먼저 매칭되도록 목록 조회 위에 둠)
   */
  sse(`${API}/owner/stores/:storeId/waitings/subscribe`, ({ client, params, request }) => {
    const storeId = Number(params.storeId)
    client.send({ event: 'connect', data: 'connected' } as never)
    const unsubscribe = subscribeOwner(storeId, (message) => {
      client.send({ event: message.type, data: JSON.stringify(message) } as never)
    })
    request.signal.addEventListener('abort', unsubscribe)
  }),

  http.get(`${API}/owner/stores/:storeId/waitings`, async ({ params, request }) => {
    await before()
    const own = ownStore(request, Number(params.storeId))
    if ('error' in own) return own.error
    return HttpResponse.json(activeQueue(own.store.id).map(toOwnerWaiting))
  }),

  http.get(`${API}/owner/stores/:storeId/waitings/settings`, async ({ params, request }) => {
    await before()
    const own = ownStore(request, Number(params.storeId))
    if ('error' in own) return own.error
    return HttpResponse.json(presentSettings(own.store))
  }),

  http.put(`${API}/owner/stores/:storeId/waitings/settings`, async ({ params, request }) => {
    await before()
    const own = ownStore(request, Number(params.storeId))
    if ('error' in own) return own.error
    // WaitingPolicyRequest { arrivalLimitMinutes } (필수)
    const b = await body<Pick<WaitingSettings, 'arrivalLimitMinutes'>>(request)
    if (b.arrivalLimitMinutes == null || b.arrivalLimitMinutes < 1 || b.arrivalLimitMinutes > 60) {
      return badRequest('도착 제한시간은 1~60분이어야 합니다.')
    }
    own.store.waitingSettings.arrivalLimitMinutes = b.arrivalLimitMinutes
    return saved(HttpResponse.json(presentSettings(own.store)))
  }),

  http.post(`${API}/owner/stores/:storeId/waitings/open`, async ({ params, request }) => {
    await before()
    const own = ownStore(request, Number(params.storeId))
    if ('error' in own) return own.error
    own.store.waitingSettings.open = true
    return saved(HttpResponse.json(presentSettings(own.store)))
  }),

  http.post(`${API}/owner/stores/:storeId/waitings/close`, async ({ params, request }) => {
    await before()
    const own = ownStore(request, Number(params.storeId))
    if ('error' in own) return own.error
    own.store.waitingSettings.open = false
    return saved(HttpResponse.json(presentSettings(own.store)))
  }),

  http.post(`${API}/owner/waitings/:waitingId/call`, async ({ params, request }) => {
    await before()
    const found = ownWaiting(request, Number(params.waitingId))
    if ('error' in found) return found.error
    if (found.w.status !== 'WAITING' && found.w.status !== 'CALLED') {
      return conflict('WAITING_NOT_CALLABLE', '대기 중이거나 호출된 고객만 호출할 수 있습니다.')
    }
    callWaiting(found.w)
    return saved(HttpResponse.json(callResult(found.w)))
  }),

  /** 입장(착석) 처리 */
  http.post(`${API}/owner/waitings/:waitingId/enter`, async ({ params, request }) => {
    await before()
    const found = ownWaiting(request, Number(params.waitingId))
    if ('error' in found) return found.error
    if (!ACTIVE_WAITING_STATUSES.includes(found.w.status)) return conflict('WAITING_NOT_ACTIVE', '이미 종료된 웨이팅입니다.')
    found.w.status = 'SEATED'
    found.w.updatedAt = nowIso()
    queueChanged(found.store.id)
    return saved(HttpResponse.json({ waitingId: found.w.waitingId, status: found.w.status, enteredAt: found.w.updatedAt }))
  }),

  http.post(`${API}/owner/waitings/:waitingId/no-show`, async ({ params, request }) => {
    await before()
    const found = ownWaiting(request, Number(params.waitingId))
    if ('error' in found) return found.error
    if (found.w.status !== 'CALLED' && found.w.status !== 'CONFIRMED') {
      return conflict('WAITING_NOT_CALLED', '호출한 고객만 노쇼 처리할 수 있습니다.')
    }
    const b = await body<{ reason: 'NO_RESPONSE' | 'NO_SHOW'; detail: string }>(request)
    if (b.reason !== 'NO_RESPONSE' && b.reason !== 'NO_SHOW') return badRequest('처리 사유를 선택해주세요.')
    if (!b.detail?.trim() || b.detail.length > 300) return badRequest('상세 사유는 1~300자로 입력해주세요.')
    endWaiting(found.w, 'NO_SHOW', b.reason, b.detail.trim())
    notify(found.w.memberId, 'WAITING_EXPIRED', found.w.waitingId, `${found.store.name} 호출에 응답이 없어 순번이 만료됐어요`)
    queueChanged(found.store.id)
    return saved(HttpResponse.json(toWaitingTermination(found.w)))
  }),

  /** 점주 취소 — 본문 { reason } 필수, 204 */
  http.delete(`${API}/owner/waitings/:waitingId`, async ({ params, request }) => {
    await before()
    const found = ownWaiting(request, Number(params.waitingId))
    if ('error' in found) return found.error
    if (!ACTIVE_WAITING_STATUSES.includes(found.w.status)) return conflict('WAITING_NOT_ACTIVE', '이미 종료된 웨이팅입니다.')
    const b = await body<{ reason: string }>(request)
    if (!b.reason?.trim() || b.reason.length > 300) return badRequest('취소 사유는 1~300자로 입력해주세요.')
    endWaiting(found.w, 'CANCELED', 'OWNER_CANCELED', b.reason.trim())
    notify(found.w.memberId, 'WAITING_CANCELED', found.w.waitingId, `${found.store.name} 사정으로 웨이팅이 취소됐어요`)
    queueChanged(found.store.id)
    return saved(new HttpResponse(null, { status: 204 }))
  }),
]

export const ownerHandlers = [...storeHandlers, ...reservationHandlers, ...waitingHandlers]
