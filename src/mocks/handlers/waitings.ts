import { http, HttpResponse } from 'msw'
import { ACTIVE_WAITING_STATUSES } from '@/entities'
import { db, nextId, type WaitingRow } from '../db'
import { endWaiting, findStore, nowIso, queueChanged, toWaiting, toWaitingRegistration, toWaitingTermination } from '../logic'
import { API, badRequest, before, body, conflict, memberIdOf, notFound, saved, unauthorized } from '../utils'

const waitingNotFound = () => notFound('WAITING_NOT_FOUND', '웨이팅을 찾을 수 없습니다.')

/** 고객 웨이팅 API — 백엔드 dev WaitingController */
export const waitingHandlers = [
  /** 신청 — 이미 이 매장에 진행 중인 웨이팅이 있으면 그대로 200 (백엔드 멱등 처리와 동일) */
  http.post(`${API}/user/waitings`, async ({ request }) => {
    await before()
    const memberId = memberIdOf(request)
    if (!memberId) return unauthorized()
    const b = await body<{ storeId: number; partyCount: number }>(request)
    const store = findStore(Number(b.storeId))
    if (!store) return notFound('STORE_NOT_FOUND', '매장을 찾을 수 없습니다')
    if (!b.partyCount || b.partyCount < 1 || b.partyCount > 20) return badRequest('인원수는 1~20명이어야 합니다.')
    if (!store.waitingAvailable || !store.waitingSettings.open) {
      return conflict('WAITING_CLOSED', '지금은 웨이팅을 받지 않는 매장입니다.')
    }
    const existing = db.waitings.find(
      (w) => w.storeId === store.id && w.memberId === memberId && ACTIVE_WAITING_STATUSES.includes(w.status),
    )
    if (existing) return HttpResponse.json(toWaitingRegistration(existing), { status: 200 })

    const lastNumber = Math.max(0, ...db.waitings.filter((w) => w.storeId === store.id).map((w) => w.waitNumber))
    const createdAt = nowIso()
    const row: WaitingRow = {
      waitingId: nextId('waiting'),
      storeId: store.id,
      memberId,
      waitNumber: lastNumber + 1,
      partyCount: b.partyCount,
      status: 'WAITING',
      createdAt,
      calledAt: null,
      callExpiresAt: null,
      updatedAt: createdAt,
    }
    db.waitings.push(row)
    queueChanged(store.id)
    return saved(HttpResponse.json(toWaitingRegistration(row), { status: 201 }))
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
    const respond = () =>
      HttpResponse.json({
        waitingId: w.waitingId,
        status: w.status,
        arrivalIntent: 'COMING',
        respondedAt: w.respondedAt,
        expiresAt: w.callExpiresAt,
      })
    if (w.status === 'CONFIRMED') return respond()
    if (w.status !== 'CALLED') return conflict('WAITING_NOT_CALLED', '호출된 웨이팅만 응답할 수 있습니다.')
    w.status = 'CONFIRMED'
    w.respondedAt = nowIso()
    w.updatedAt = w.respondedAt
    queueChanged(w.storeId)
    return saved(respond())
  }),

  http.delete(`${API}/user/waitings/:waitingId`, async ({ params, request }) => {
    await before()
    const w = db.waitings.find((x) => x.waitingId === Number(params.waitingId))
    if (!w || w.memberId !== memberIdOf(request)) return waitingNotFound()
    if (!ACTIVE_WAITING_STATUSES.includes(w.status)) return conflict('WAITING_NOT_CANCELLABLE', '취소할 수 없는 웨이팅입니다.')
    endWaiting(w, 'CANCELED', 'CUSTOMER_CANCELED')
    queueChanged(w.storeId)
    return saved(HttpResponse.json(toWaitingTermination(w)))
  }),
]
