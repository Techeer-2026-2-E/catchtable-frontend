import { http, HttpResponse } from 'msw'
import { dayjs } from '@/shared/lib/dayjs'
import { db, nextId } from '../db'
import { findStore, nowIso, paginate, toIso } from '../logic'
import { API, badRequest, before, body, conflict, memberIdOf, notFound, saved, unauthorized } from '../utils'
import { createConfirmedReservation } from './reservations'

const present = ({ memberId: _m, paymentKey: _k, ...p }: (typeof db.payments)[number]) => p

/** 예약금 결제 — 조회(GET)만 백엔드 dev 에 있음. prepare·confirm·sync·cancel 은 [목 전용] */
export const paymentHandlers = [
  http.post(`${API}/user/payments/prepare`, async ({ request }) => {
    await before()
    const memberId = memberIdOf(request)
    if (!memberId) return unauthorized()
    const { holdId } = await body<{ holdId: number }>(request)
    const hold = db.holds.find((h) => h.holdId === holdId && h.memberId === memberId)
    if (!hold) return notFound('HOLD_NOT_FOUND', '선점 정보를 찾을 수 없습니다.')
    if (hold.status !== 'PENDING_PAYMENT') return conflict('HOLD_EXPIRED', '선점 시간이 지났습니다. 다시 시도해주세요.')
    const store = findStore(hold.storeId)!
    const orderId = `ORDER-${hold.holdId}-${Date.now()}`
    const orderName = `${store.name} 예약금 (${hold.partySize}명)`
    db.payments.push({
      paymentId: nextId('payment'),
      memberId,
      reservationId: null,
      holdId: hold.holdId,
      orderId,
      orderName,
      amount: hold.depositAmount,
      status: 'READY',
      method: null,
      approvedAt: null,
      canceledAmount: 0,
      receiptUrl: null,
      paymentKey: null,
    })
    return saved(HttpResponse.json({ orderId, orderName, amount: hold.depositAmount }))
  }),

  /** 결제 승인 → 결제 완료 + 예약 확정 */
  http.post(`${API}/user/payments/confirm`, async ({ request }) => {
    await before()
    const memberId = memberIdOf(request)
    if (!memberId) return unauthorized()
    const b = await body<{ paymentKey: string; orderId: string; amount: number }>(request)
    const payment = db.payments.find((p) => p.orderId === b.orderId && p.memberId === memberId)
    if (!payment) return notFound('PAYMENT_NOT_FOUND', '결제 정보를 찾을 수 없습니다.')
    if (payment.status === 'DONE') return HttpResponse.json({ payment: present(payment), reservationId: payment.reservationId })
    if (payment.amount !== b.amount) return badRequest('결제 금액이 일치하지 않습니다.', 'INVALID_AMOUNT')
    const hold = db.holds.find((h) => h.holdId === payment.holdId)!
    if (hold.status !== 'PENDING_PAYMENT' || !dayjs(hold.expiresAt).isAfter(dayjs())) {
      payment.status = 'FAILED'
      return saved(conflict('HOLD_EXPIRED', '선점 시간이 지나 결제가 취소됐습니다. 다시 시도해주세요.'))
    }
    hold.status = 'CONFIRMED'
    payment.status = 'DONE'
    payment.method = '카드'
    payment.paymentKey = b.paymentKey ?? null
    payment.approvedAt = nowIso()
    const reservation = createConfirmedReservation({
      memberId,
      storeId: hold.storeId,
      tableId: hold.tableId,
      startAt: dayjs(hold.reservationStartAt),
      partySize: hold.partySize,
      paymentId: payment.paymentId,
      reservationId: hold.reservationId,
    })
    payment.reservationId = reservation.reservationId
    return saved(HttpResponse.json({ payment: present(payment), reservationId: reservation.reservationId }))
  }),

  http.get(`${API}/user/payments`, async ({ request }) => {
    await before()
    const memberId = memberIdOf(request)
    if (!memberId) return unauthorized()
    const list = db.payments.filter((p) => p.memberId === memberId && p.status !== 'READY').sort((a, b) => b.paymentId - a.paymentId)
    const { items, page, size, hasNext } = paginate(list, new URL(request.url))
    return HttpResponse.json({ payments: items.map(present), page, size, hasNext })
  }),

  http.get(`${API}/user/payments/:paymentId`, async ({ params, request }) => {
    await before()
    const p = db.payments.find((x) => x.paymentId === Number(params.paymentId) && x.memberId === memberIdOf(request))
    if (!p) return notFound('PAYMENT_NOT_FOUND', '결제 정보를 찾을 수 없습니다.')
    const refunds = p.canceledAmount
      ? [{ refundId: p.paymentId, refundAmount: p.canceledAmount, status: 'COMPLETED', cancelReason: '고객 예약 취소', refundedAt: p.approvedAt }]
      : []
    return HttpResponse.json({ payment: present(p), refunds })
  }),

  http.post(`${API}/user/payments/:paymentId/sync`, async ({ params, request }) => {
    await before()
    const p = db.payments.find((x) => x.paymentId === Number(params.paymentId) && x.memberId === memberIdOf(request))
    return p ? HttpResponse.json(present(p)) : notFound('PAYMENT_NOT_FOUND', '결제 정보를 찾을 수 없습니다.')
  }),

  http.post(`${API}/user/payments/:paymentId/cancel`, async ({ params, request }) => {
    await before()
    const p = db.payments.find((x) => x.paymentId === Number(params.paymentId) && x.memberId === memberIdOf(request))
    if (!p) return notFound('PAYMENT_NOT_FOUND', '결제 정보를 찾을 수 없습니다.')
    const b = await body<{ amount: number }>(request)
    const amount = Math.min(b.amount ?? p.amount - p.canceledAmount, p.amount - p.canceledAmount)
    p.canceledAmount += amount
    p.status = p.canceledAmount >= p.amount ? 'REFUNDED' : 'PARTIAL_REFUNDED'
    p.approvedAt ??= toIso(dayjs())
    return saved(HttpResponse.json(present(p)))
  }),
]
