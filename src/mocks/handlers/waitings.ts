import { http, HttpResponse } from 'msw'
import { ACTIVE_WAITING_STATUSES } from '@/entities'
import { dayjs } from '@/shared/lib/dayjs'
import { db, nextId } from '../db'
import { findStore, nowIso, toIso, toWaiting } from '../logic'
import { API, badRequest, before, body, conflict, memberIdOf, notFound, saved, unauthorized } from '../utils'

const waitingNotFound = () => notFound('WAITING_NOT_FOUND', '웨이팅을 찾을 수 없습니다.')
const DEFER_MINUTES = 5

/** 고객 웨이팅 API — 경로는 노션 명세, 필드는 백엔드 feat/waiting-join DTO */
export const waitingHandlers = [
  /** 신청 — 이미 이 매장에 진행 중인 웨이팅이 있으면 그대로 200 (백엔드 멱등 처리와 동일) */
  http.post(`${API}/user/waitings`, async ({ request }) => {
    await before()
    const memberId = memberIdOf(request)
    if (!memberId) return unauthorized()
    const b = await body<{ storeId: number; partyCount: number; seatPreference?: string }>(request)
    const store = findStore(Number(b.storeId))
    if (!store) return notFound('STORE_NOT_FOUND', '매장을 찾을 수 없습니다')
    if (!b.partyCount || b.partyCount < 1 || b.partyCount > 20) return badRequest('인원수는 1~20명이어야 합니다.')
    if (!store.waitingAvailable || !store.waitingSettings.open) {
      return conflict('WAITING_CLOSED', '지금은 웨이팅을 받지 않는 매장입니다.')
    }
    const existing = db.waitings.find(
      (w) => w.storeId === store.id && w.memberId === memberId && ACTIVE_WAITING_STATUSES.includes(w.status),
    )
    if (existing) return HttpResponse.json(toWaiting(existing), { status: 200 })

    const lastNumber = Math.max(0, ...db.waitings.filter((w) => w.storeId === store.id).map((w) => w.waitNumber))
    const createdAt = nowIso()
    const row = {
      waitingId: nextId('waiting'),
      storeId: store.id,
      memberId,
      waitNumber: lastNumber + 1,
      partyCount: b.partyCount,
      status: 'WAITING' as const,
      seatPreference: b.seatPreference ?? null,
      createdAt,
      calledAt: null,
      callExpiresAt: null,
      deferRemaining: 1,
      recallCount: 0,
      updatedAt: createdAt,
    }
    db.waitings.push(row)
    return saved(HttpResponse.json(toWaiting(row), { status: 201 }))
  }),

  /** [경로 제안] 내 웨이팅 목록 — 최신순 */
  http.get(`${API}/user/waitings`, async ({ request }) => {
    await before()
    const memberId = memberIdOf(request)
    if (!memberId) return unauthorized()
    const list = db.waitings.filter((w) => w.memberId === memberId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return HttpResponse.json(list.map(toWaiting))
  }),

  http.get(`${API}/user/waitings/:waitingId`, async ({ params, request }) => {
    await before()
    const w = db.waitings.find((x) => x.waitingId === Number(params.waitingId))
    if (!w || w.memberId !== memberIdOf(request)) return waitingNotFound()
    return HttpResponse.json(toWaiting(w))
  }),

  /** 호출 수락 (도착했어요) — CALLED → CONFIRMED */
  http.post(`${API}/user/waitings/:waitingId/accept`, async ({ params, request }) => {
    await before()
    const w = db.waitings.find((x) => x.waitingId === Number(params.waitingId))
    if (!w || w.memberId !== memberIdOf(request)) return waitingNotFound()
    if (w.status === 'CONFIRMED') return HttpResponse.json(toWaiting(w))
    if (w.status !== 'CALLED') return conflict('WAITING_NOT_CALLED', '호출된 웨이팅만 응답할 수 있습니다.')
    w.status = 'CONFIRMED'
    w.updatedAt = nowIso()
    return saved(HttpResponse.json(toWaiting(w)))
  }),

  /** 순번 연기 (조금 늦어요) — 호출 상태에서 1회, 도착 제한시간 5분 연장 */
  http.post(`${API}/user/waitings/:waitingId/defer`, async ({ params, request }) => {
    await before()
    const w = db.waitings.find((x) => x.waitingId === Number(params.waitingId))
    if (!w || w.memberId !== memberIdOf(request)) return waitingNotFound()
    if (w.status !== 'CALLED' && w.status !== 'CONFIRMED') {
      return conflict('WAITING_NOT_CALLED', '호출된 웨이팅만 연기할 수 있습니다.')
    }
    if (w.deferRemaining <= 0) return conflict('DEFER_LIMIT_EXCEEDED', '연기는 한 번만 할 수 있습니다.')
    w.deferRemaining -= 1
    w.callExpiresAt = toIso(dayjs(w.callExpiresAt ?? undefined).add(DEFER_MINUTES, 'minute'))
    w.updatedAt = nowIso()
    return saved(HttpResponse.json(toWaiting(w)))
  }),

  http.delete(`${API}/user/waitings/:waitingId`, async ({ params, request }) => {
    await before()
    const w = db.waitings.find((x) => x.waitingId === Number(params.waitingId))
    if (!w || w.memberId !== memberIdOf(request)) return waitingNotFound()
    if (!ACTIVE_WAITING_STATUSES.includes(w.status)) return conflict('WAITING_NOT_CANCELLABLE', '취소할 수 없는 웨이팅입니다.')
    w.status = 'CANCELED'
    w.updatedAt = nowIso()
    return saved(new HttpResponse(null, { status: 204 }))
  }),
]
