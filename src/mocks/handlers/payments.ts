import { http, HttpResponse } from 'msw'
import { dayjs } from '@/shared/lib/dayjs'
import { db, nextId, persist, type PaymentRow, type ReservationRow } from '../db'
import { findStore, notify, nowIso, toIso } from '../logic'
import { API, badRequest, before, body, conflict, fail, memberIdOf, notFound, saved, unauthorized } from '../utils'
import { createConfirmedReservation, pickTable } from './reservations'
import type { PreparedPayment } from '@/entities'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

/** 목 전용 예약금 매장 — 실제 금액은 백엔드 기능33 설정이 정한다 */
export const MOCK_DEPOSIT_STORES: Record<number, { amount: number; policy: PreparedPayment['refundPolicy'] }> = {
  3: { amount: 10_000, policy: 'STANDARD' },
}

/** 매장 예약금 — 점주가 정책을 저장했으면 그 값, 아니면 목 기본값 */
export function depositOf(storeId: number) {
  const deposit = db.stores.find((s) => s.id === storeId)?.deposit
  if (!deposit) return MOCK_DEPOSIT_STORES[storeId]
  return deposit.enabled && deposit.policy ? { amount: deposit.amount, policy: deposit.policy } : undefined
}

const HOLD_MINUTES = 5
const REFUND_RULES = {
  FLEXIBLE: [{ minDaysBefore: 1, refundRate: 100 }, { minDaysBefore: 0, refundRate: 50 }],
  STANDARD: [{ minDaysBefore: 2, refundRate: 100 }, { minDaysBefore: 1, refundRate: 50 }, { minDaysBefore: 0, refundRate: 0 }],
  STRICT: [{ minDaysBefore: 3, refundRate: 100 }, { minDaysBefore: 2, refundRate: 50 }, { minDaysBefore: 1, refundRate: 20 }, { minDaysBefore: 0, refundRate: 0 }],
}
const POLICY_NAMES = { FLEXIBLE: '유연', STANDARD: '일반', STRICT: '엄격' }
const POLICY_NOTICE = '매장 현지시간(Asia/Seoul)의 예약일 기준입니다. 점주 취소는 전액 환불하며 노쇼는 환불하지 않습니다.'
const RECEIPT_NOTICE = '테스트 결제입니다. 실제 영수증이나 매출 증빙이 아닙니다.'
const paymentNotFound = () => notFound('PAYMENT_NOT_FOUND', '결제를 찾을 수 없습니다.')
const holdNotFound = () => notFound('RESERVATION_NOT_FOUND', '예약을 찾을 수 없습니다.')

const expireHold = (r: ReservationRow) => {
  if (r.status === 'PENDING_PAYMENT' && r.holdExpiresAt && !dayjs(r.holdExpiresAt).isAfter(dayjs())) r.status = 'EXPIRED'
}

const toHold = (r: ReservationRow) => {
  expireHold(r)
  return {
    holdId: r.reservationId,
    reservationId: r.reservationId,
    storeId: r.storeId,
    tableId: r.tableId,
    reservationStartAt: r.reservationStartAt,
    reservationEndAt: r.reservationEndAt,
    partySize: r.partySize,
    status: r.status,
    expiresAt: r.holdExpiresAt!,
    serverTime: nowIso(),
    remainingSeconds: r.status === 'PENDING_PAYMENT' ? Math.max(0, dayjs(r.holdExpiresAt).diff(dayjs(), 'second')) : 0,
  }
}

const toPayment = (p: PaymentRow) => ({
  paymentId: p.paymentId,
  reservationId: ['DONE', 'PARTIAL_REFUNDED', 'REFUNDED'].includes(p.status) ? p.holdId : null,
  holdId: p.holdId,
  orderId: p.orderId,
  orderName: p.orderName,
  amount: p.amount,
  status: p.status,
  method: p.method,
  approvedAt: p.approvedAt,
  canceledAmount: p.canceledAmount,
  receiptUrl: p.receiptUrl,
  refundRequired: p.refundRequired ?? false,
})

const toDetail = (p: PaymentRow) => ({ ...toPayment(p), refunds: p.refunds, receiptNotice: RECEIPT_NOTICE })

/** 목도 최초 정책·서울 날짜 기준으로 계산한다. 실제 정책은 서버 응답을 사용한다. */
const refundRate = (r: ReservationRow) => {
  if (!r.refundPolicySnapshot) return 0
  const days = dayjs(r.reservationStartAt).tz('Asia/Seoul').startOf('day').diff(dayjs().tz('Asia/Seoul').startOf('day'), 'day')
  return REFUND_RULES[r.refundPolicySnapshot].find((rule) => days >= rule.minDaysBefore)?.refundRate ?? 0
}

// 목에서 워커의 시간 경과를 모사한다. 실제 비동기 처리는 백엔드 아웃박스가 담당한다.
function completeMockRefund(p: PaymentRow) {
  const request = p.unconfirmedRefund
  if (request?.refundStatus !== 'REQUESTED' || dayjs().diff(dayjs(request.requestedAt), 'millisecond') < 500) return
  request.refundStatus = 'COMPLETED'
  request.completedAt = nowIso()
  p.canceledAmount = p.amount
  p.status = 'REFUNDED'
  p.refunds.push({ refundId: nextId('refund'), refundAmount: request.refundAmount, status: 'COMPLETED', cancelReason: '예약 미확정 결제 전액 환불', refundedAt: request.completedAt })
  persist()
}

const publicRefundRequest = (p: PaymentRow) => {
  if (!p.unconfirmedRefund) return null
  const r = p.unconfirmedRefund
  return { requestId: r.requestId, paymentId: r.paymentId, reservationId: r.reservationId, currency: r.currency,
    refundAmount: r.refundAmount, refundStatus: r.refundStatus, requestedAt: r.requestedAt, completedAt: r.completedAt }
}

export const refundableAmount = (r: ReservationRow) => {
  const payment = db.payments.find((p) => p.holdId === r.reservationId && p.approvedAt)
  if (!payment) return 0
  return Math.max(0, Math.floor((payment.amount * refundRate(r)) / 100) - payment.canceledAmount)
}

/** 예약 취소에 딸린 환불 — 같은 키는 한 번만 처리 */
export function refundForCancel(r: ReservationRow, key: string) {
  const payment = db.payments.find((p) => p.holdId === r.reservationId && p.approvedAt)
  if (!payment || payment.refundKeys.includes(key)) return
  const amount = refundableAmount(r)
  if (amount === 0) return
  payment.refundKeys.push(key)
  payment.canceledAmount += amount
  payment.status = payment.canceledAmount >= payment.amount ? 'REFUNDED' : 'PARTIAL_REFUNDED'
  payment.refunds.push({ refundId: nextId('refund'), refundAmount: amount, status: 'COMPLETED', cancelReason: '고객 요청', refundedAt: nowIso() })
}

/** 결제 API — 백엔드 dev 와 같은 경로·응답. 승인은 항상 성공 */
export const paymentHandlers = [
  http.post(`${API}/user/reservations/holds`, async ({ request }) => {
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
      hold: true,
    })
    row.holdExpiresAt = toIso(dayjs().add(HOLD_MINUTES, 'minute'))
    row.depositAmountSnapshot = depositOf(row.storeId)?.amount ?? null
    row.refundPolicySnapshot = depositOf(row.storeId)?.policy ?? null
    return saved(HttpResponse.json(toHold(row), { status: 201 }))
  }),

  http.get(`${API}/user/reservations/holds/:holdId`, async ({ params, request }) => {
    await before()
    const r = db.reservations.find((x) => x.reservationId === Number(params.holdId))
    if (!r || r.memberId !== memberIdOf(request) || !r.holdExpiresAt) return holdNotFound()
    return saved(HttpResponse.json(toHold(r)))
  }),

  http.delete(`${API}/user/reservations/holds/:holdId`, async ({ params, request }) => {
    await before()
    const r = db.reservations.find((x) => x.reservationId === Number(params.holdId))
    if (!r || r.memberId !== memberIdOf(request) || !r.holdExpiresAt) return holdNotFound()
    expireHold(r)
    if (r.status === 'CONFIRMED') return conflict('RESERVATION_NOT_CANCELLABLE', '취소할 수 없는 예약입니다.')
    if (r.status === 'PENDING_PAYMENT') {
      r.status = 'CANCELLED'
      r.cancelledAt = nowIso()
      r.cancellationActor = 'CUSTOMER'
      r.cancellationReason = '결제 전 선점 취소'
    }
    return saved(new HttpResponse(null, { status: 204 }))
  }),

  http.get(`${API}/user/reservations/:reservationId/refund-preview`, async ({ params, request }) => {
    await before()
    const r = db.reservations.find((x) => x.reservationId === Number(params.reservationId))
    if (!r || r.memberId !== memberIdOf(request)) return holdNotFound()
    if (r.status !== 'CONFIRMED' || r.checkedInAt || !dayjs(r.reservationStartAt).isAfter(dayjs())) {
      return conflict('RESERVATION_NOT_CANCELLABLE', '취소할 수 없는 예약입니다.')
    }
    const payment = db.payments.find((p) => p.holdId === r.reservationId && p.approvedAt)
    const paidAmount = payment?.amount ?? 0
    const refundable = refundableAmount(r)
    return HttpResponse.json({
      reservationId: r.reservationId,
      paymentId: payment?.paymentId ?? null,
      currency: 'KRW',
      paidAmount,
      alreadyRefundedAmount: payment?.canceledAmount ?? 0,
      policyType: payment ? r.refundPolicySnapshot ?? null : null,
      reservationStartAt: r.reservationStartAt,
      calculatedAt: nowIso(),
      refundRate: refundRate(r),
      refundableAmount: refundable,
      nonRefundableAmount: Math.max(0, paidAmount - (payment?.canceledAmount ?? 0) - refundable),
      policyDescription: payment ? POLICY_NOTICE : '결제 금액이 없습니다.',
    })
  }),

  http.post(`${API}/user/payments/prepare`, async ({ request }) => {
    await before()
    const memberId = memberIdOf(request)
    if (!memberId) return unauthorized()
    const { holdId } = await body<{ holdId: number }>(request)
    if (!holdId) return badRequest('holdId 는 필수입니다.')
    const r = db.reservations.find((x) => x.reservationId === Number(holdId) && x.memberId === memberId)
    if (!r || !r.holdExpiresAt) return holdNotFound()
    expireHold(r)
    const deposit = r.depositAmountSnapshot && r.refundPolicySnapshot ? { amount: r.depositAmountSnapshot, policy: r.refundPolicySnapshot } : null
    if (!deposit) return conflict('PAYMENT_MISMATCH', '결제 정보가 주문과 일치하지 않습니다.')
    if (r.status !== 'PENDING_PAYMENT') return conflict('INVALID_PAYMENT_STATUS', '현재 결제 상태에서 할 수 없는 요청입니다.')
    const existing = db.payments.find((p) => p.holdId === r.reservationId)
    if (existing && existing.status !== 'READY') {
      return conflict('PAYMENT_STATUS_CHECK_REQUIRED', '진행하거나 완료한 결제가 있습니다. 기존 결제 상태를 조회해 주세요.')
    }
    const payment: PaymentRow = existing ?? {
      paymentId: nextId('payment'),
      memberId,
      holdId: r.reservationId,
      orderId: `ct-mock-${crypto.randomUUID()}`,
      orderName: '예약금',
      amount: deposit.amount,
      status: 'READY',
      method: null,
      approvedAt: null,
      canceledAmount: 0,
      receiptUrl: null,
      refunds: [],
      refundKeys: [],
    }
    if (!existing) db.payments.push(payment)
    return saved(
      HttpResponse.json(
        {
          paymentId: payment.paymentId,
          reservationId: r.reservationId,
          holdId: r.reservationId,
          orderId: payment.orderId,
          orderName: payment.orderName,
          amount: payment.amount,
          status: payment.status,
          expiresAt: r.holdExpiresAt,
          serverTime: nowIso(),
          remainingSeconds: Math.max(0, dayjs(r.holdExpiresAt).diff(dayjs(), 'second')),
          refundPolicy: deposit.policy,
          refundPolicyName: POLICY_NAMES[deposit.policy],
          refundRules: REFUND_RULES[deposit.policy],
          refundPolicyNotice: POLICY_NOTICE,
        },
        { status: existing ? 200 : 201 },
      ),
    )
  }),

  http.post(`${API}/user/payments/confirm`, async ({ request }) => {
    await before()
    const memberId = memberIdOf(request)
    if (!memberId) return unauthorized()
    const b = await body<{ orderId: string; paymentKey: string; amount: number }>(request)
    const payment = db.payments.find((p) => p.orderId === b.orderId && p.memberId === memberId)
    if (!payment) return paymentNotFound()
    if (payment.amount !== b.amount) return conflict('PAYMENT_MISMATCH', '결제 정보가 주문과 일치하지 않습니다.')
    const r = db.reservations.find((x) => x.reservationId === payment.holdId)!
    if (payment.status === 'READY') {
      expireHold(r)
      if (r.status !== 'PENDING_PAYMENT') return conflict('INVALID_PAYMENT_STATUS', '현재 결제 상태에서 할 수 없는 요청입니다.')
      payment.status = 'DONE'
      payment.method = '카드'
      payment.approvedAt = nowIso()
      r.status = 'CONFIRMED'
      r.confirmedAt = payment.approvedAt
      notify(r.memberId, 'RESERVATION_CONFIRMED', r.reservationId, `${findStore(r.storeId)?.name} 예약이 확정되었어요`)
    }
    return saved(HttpResponse.json(toPayment(payment)))
  }),

  http.get(`${API}/user/payments`, async ({ request }) => {
    await before()
    const memberId = memberIdOf(request)
    if (!memberId) return unauthorized()
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? 0)
    const size = Number(url.searchParams.get('size') ?? 10)
    const mine = db.payments.filter((p) => p.memberId === memberId).sort((a, b) => b.paymentId - a.paymentId)
    return HttpResponse.json({
      payments: mine.slice(page * size, (page + 1) * size).map(toPayment),
      page,
      size,
      hasNext: mine.length > (page + 1) * size,
    })
  }),

  http.get(`${API}/user/payments/:paymentId/unconfirmed-refund`, async ({ params, request }) => {
    await before()
    const memberId = memberIdOf(request)
    if (!memberId) return unauthorized()
    if (db.members.find((m) => m.id === memberId)?.userType !== 'CUSTOMER') return fail(403, 'FORBIDDEN_MEMBER_TYPE', '고객만 요청할 수 있습니다.')
    const p = db.payments.find((row) => row.paymentId === Number(params.paymentId) && row.memberId === memberIdOf(request))
    if (!p) return paymentNotFound()
    completeMockRefund(p)
    return p.unconfirmedRefund ? HttpResponse.json(publicRefundRequest(p)) : new HttpResponse(null, { status: 204 })
  }),
  http.post(`${API}/user/payments/:paymentId/unconfirmed-refund`, async ({ params, request }) => {
    await before()
    const memberId = memberIdOf(request)
    if (!memberId) return unauthorized()
    if (db.members.find((m) => m.id === memberId)?.userType !== 'CUSTOMER') return fail(403, 'FORBIDDEN_MEMBER_TYPE', '고객만 요청할 수 있습니다.')
    const key = request.headers.get('Idempotency-Key')
    if (!key?.trim() || key.length > 300) return badRequest('Idempotency-Key 는 필수입니다.')
    const p = db.payments.find((row) => row.paymentId === Number(params.paymentId) && row.memberId === memberIdOf(request))
    if (!p) return paymentNotFound()
    if (p.unconfirmedRefund?.key === key) return p.unconfirmedRefund.refundStatus === 'FAILED'
      ? conflict('PAYMENT_REFUND_FAILED', '거절된 환불 요청입니다.') : HttpResponse.json(publicRefundRequest(p))
    if (p.unconfirmedRefund && ['REQUESTED', 'UNKNOWN'].includes(p.unconfirmedRefund.refundStatus)) return conflict('REFUND_DATA_NOT_READY', '환불을 확인 중입니다.')
    const reservation = db.reservations.find((r) => r.reservationId === p.holdId)
    if (!p.refundRequired || !reservation || reservation.confirmedAt || !['EXPIRED', 'CANCELLED'].includes(reservation.status)
      || !['DONE', 'PARTIAL_REFUNDED'].includes(p.status)) return conflict('PAYMENT_NOT_REFUNDABLE', '미확정 승인 환불 대상이 아닙니다.')
    p.unconfirmedRefund = { requestId: nextId('refund'), paymentId: p.paymentId, reservationId: p.holdId, currency: 'KRW',
      refundAmount: p.amount - p.canceledAmount, refundStatus: 'REQUESTED', requestedAt: nowIso(), completedAt: null, key }
    return saved(HttpResponse.json(publicRefundRequest(p), { status: 202 }))
  }),
  http.get(`${API}/user/payments/:paymentId`, async ({ params, request }) => {
    await before()
    const payment = db.payments.find((p) => p.paymentId === Number(params.paymentId) && p.memberId === memberIdOf(request))
    if (payment) completeMockRefund(payment)
    return payment ? HttpResponse.json(toDetail(payment)) : paymentNotFound()
  }),

  http.post(`${API}/user/payments/:paymentId/sync`, async ({ params, request }) => {
    await before()
    const payment = db.payments.find((p) => p.paymentId === Number(params.paymentId) && p.memberId === memberIdOf(request))
    if (payment) completeMockRefund(payment)
    return payment ? HttpResponse.json(toDetail(payment)) : paymentNotFound()
  }),
]
