import { http, HttpResponse } from 'msw'
import { db, nextId } from '../db'
import { findStore, nowIso, toReview } from '../logic'
import { API, badRequest, before, body, conflict, memberIdOf, notFound, saved, unauthorized } from '../utils'

const reviewNotFound = () => notFound('REVIEW_NOT_FOUND', '리뷰를 찾을 수 없습니다.')

/** P2 리뷰 — 노션 명세(reviews) 경로, 응답 필드는 제안 */
export const reviewHandlers = [
  /** 리뷰 작성 가능한 방문 — 이용 완료 + 미작성 */
  http.get(`${API}/user/reviews/writable`, async ({ request }) => {
    await before()
    const memberId = memberIdOf(request)
    if (!memberId) return unauthorized()
    const written = new Set(db.reviews.map((r) => r.reservationId))
    const list = db.reservations
      .filter((r) => r.memberId === memberId && r.status === 'COMPLETED' && !written.has(r.reservationId))
      .sort((a, b) => b.reservationStartAt.localeCompare(a.reservationStartAt))
      .map((r) => ({
        reservationId: r.reservationId,
        storeId: r.storeId,
        storeName: findStore(r.storeId)?.name ?? '',
        reservationStartAt: r.reservationStartAt,
        partySize: r.partySize,
      }))
    return HttpResponse.json(list)
  }),

  http.get(`${API}/user/members/me/reviews`, async ({ request }) => {
    await before()
    const memberId = memberIdOf(request)
    if (!memberId) return unauthorized()
    const list = db.reviews.filter((r) => r.memberId === memberId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return HttpResponse.json(list.map(toReview))
  }),

  http.post(`${API}/user/reviews`, async ({ request }) => {
    await before()
    const memberId = memberIdOf(request)
    if (!memberId) return unauthorized()
    const b = await body<{ reservationId: number; rating: number; content: string; imageUrls: string[] }>(request)
    const reservation = db.reservations.find((r) => r.reservationId === b.reservationId && r.memberId === memberId)
    if (!reservation) return notFound('RESERVATION_NOT_FOUND', '예약을 찾을 수 없습니다.')
    if (reservation.status !== 'COMPLETED') return conflict('REVIEW_NOT_ALLOWED', '이용 완료된 방문만 리뷰를 쓸 수 있습니다.')
    if (db.reviews.some((r) => r.reservationId === reservation.reservationId)) {
      return conflict('REVIEW_ALREADY_EXISTS', '이미 리뷰를 작성한 방문입니다.')
    }
    if (!b.rating || b.rating < 1 || b.rating > 5) return badRequest('별점은 1~5점이어야 합니다.')
    if (!b.content || b.content.trim().length < 10) return badRequest('리뷰는 10자 이상 작성해주세요.')
    const row = {
      reviewId: nextId('review'),
      storeId: reservation.storeId,
      memberId,
      reservationId: reservation.reservationId,
      rating: b.rating,
      content: b.content.trim(),
      imageUrls: b.imageUrls ?? [],
      createdAt: nowIso(),
      updatedAt: null,
      reply: null,
    }
    db.reviews.push(row)
    return saved(HttpResponse.json(toReview(row), { status: 201 }))
  }),

  http.patch(`${API}/user/reviews/:reviewId`, async ({ params, request }) => {
    await before()
    const r = db.reviews.find((x) => x.reviewId === Number(params.reviewId) && x.memberId === memberIdOf(request))
    if (!r) return reviewNotFound()
    const b = await body<{ rating: number; content: string }>(request)
    if (b.rating !== undefined && (b.rating < 1 || b.rating > 5)) return badRequest('별점은 1~5점이어야 합니다.')
    if (b.content !== undefined && b.content.trim().length < 10) return badRequest('리뷰는 10자 이상 작성해주세요.')
    if (b.rating !== undefined) r.rating = b.rating
    if (b.content !== undefined) r.content = b.content.trim()
    r.updatedAt = nowIso()
    return saved(HttpResponse.json(toReview(r)))
  }),

  http.delete(`${API}/user/reviews/:reviewId`, async ({ params, request }) => {
    await before()
    const r = db.reviews.find((x) => x.reviewId === Number(params.reviewId) && x.memberId === memberIdOf(request))
    if (!r) return reviewNotFound()
    db.reviews = db.reviews.filter((x) => x !== r)
    return saved(new HttpResponse(null, { status: 204 }))
  }),

  /** 점주 답글 */
  http.post(`${API}/user/reviews/:reviewId/reply`, async ({ params, request }) => {
    await before()
    const r = db.reviews.find((x) => x.reviewId === Number(params.reviewId))
    if (!r) return reviewNotFound()
    const store = findStore(r.storeId)
    if (store?.ownerId !== memberIdOf(request)) return reviewNotFound()
    const b = await body<{ content: string }>(request)
    if (!b.content?.trim()) return badRequest('답글 내용을 입력해주세요.')
    r.reply = { content: b.content.trim(), createdAt: nowIso() }
    return saved(HttpResponse.json(toReview(r)))
  }),
]
