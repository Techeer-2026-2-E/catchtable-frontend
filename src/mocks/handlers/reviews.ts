import { http, HttpResponse } from 'msw'
import { db, nextId, type ReviewRow } from '../db'
import { findStore, nowIso, paginate, toMyReview, toStoreReview } from '../logic'
import { API, badRequest, before, body, conflict, memberIdOf, notFound, saved, unauthorized } from '../utils'

const reviewNotFound = () => notFound('REVIEW_NOT_FOUND', '리뷰를 찾을 수 없습니다.')

/** 리뷰 — 백엔드 dev ReviewController (작성 가능 방문·점주 답글은 [목 전용]) */

const CONTENT_MAX = 1000
/** 백엔드는 http(s) URL 1개만 받음. 목에서는 화면 미리보기용 data: URL 도 허용 */
const validImage = (url: string) => url === '' || /^(https?:\/\/|data:image\/)/.test(url)

const toResult = (r: ReviewRow) => ({
  reviewId: r.reviewId,
  reservationId: r.reservationId,
  rating: r.rating,
  content: r.content,
  imageUrl: r.imageUrl,
  createdAt: r.createdAt,
})
export const reviewHandlers = [
  /** [목 전용] 리뷰 작성 가능한 방문 — 이용 완료 + 미작성 */
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
    const { items, page, size, hasNext } = paginate(list, new URL(request.url))
    return HttpResponse.json({ reviews: items.map(toMyReview), page, size, hasNext })
  }),

  http.post(`${API}/user/reviews`, async ({ request }) => {
    await before()
    const memberId = memberIdOf(request)
    if (!memberId) return unauthorized()
    const b = await body<{ reservationId: number; rating: number; content: string; imageUrl: string }>(request)
    const reservation = db.reservations.find((r) => r.reservationId === b.reservationId && r.memberId === memberId)
    if (!reservation) return notFound('RESERVATION_NOT_FOUND', '예약을 찾을 수 없습니다.')
    if (reservation.status !== 'COMPLETED') return conflict('REVIEW_NOT_ALLOWED', '이용 완료된 방문만 리뷰를 쓸 수 있습니다.')
    if (db.reviews.some((r) => r.reservationId === reservation.reservationId)) {
      return conflict('REVIEW_ALREADY_EXISTS', '이미 리뷰를 작성한 방문입니다.')
    }
    if (!b.rating || b.rating < 1 || b.rating > 5) return badRequest('별점은 1~5점이어야 합니다.')
    if (!b.content?.trim() || b.content.length > CONTENT_MAX) return badRequest('리뷰 내용은 1~1000자로 작성해주세요.')
    if (b.imageUrl != null && !validImage(b.imageUrl)) return badRequest('사진 주소가 올바르지 않습니다.')
    const row: ReviewRow = {
      reviewId: nextId('review'),
      storeId: reservation.storeId,
      memberId,
      reservationId: reservation.reservationId,
      rating: b.rating,
      content: b.content.trim(),
      imageUrl: b.imageUrl || null,
      createdAt: nowIso(),
      updatedAt: null,
      reply: null,
    }
    db.reviews.push(row)
    return saved(HttpResponse.json(toResult(row), { status: 201 }))
  }),

  http.patch(`${API}/user/reviews/:reviewId`, async ({ params, request }) => {
    await before()
    const r = db.reviews.find((x) => x.reviewId === Number(params.reviewId) && x.memberId === memberIdOf(request))
    if (!r) return reviewNotFound()
    // 보낸 필드만 수정 — imageUrl "" 은 사진 삭제
    const b = await body<{ rating: number; content: string; imageUrl: string }>(request)
    if (b.rating != null && (b.rating < 1 || b.rating > 5)) return badRequest('별점은 1~5점이어야 합니다.')
    if (b.content != null && (!b.content.trim() || b.content.length > CONTENT_MAX)) {
      return badRequest('리뷰 내용은 1~1000자로 작성해주세요.')
    }
    if (b.imageUrl != null && !validImage(b.imageUrl)) return badRequest('사진 주소가 올바르지 않습니다.')
    if (b.rating != null) r.rating = b.rating
    if (b.content != null) r.content = b.content.trim()
    if (b.imageUrl != null) r.imageUrl = b.imageUrl || null
    r.updatedAt = nowIso()
    return saved(HttpResponse.json(toResult(r)))
  }),

  http.delete(`${API}/user/reviews/:reviewId`, async ({ params, request }) => {
    await before()
    const r = db.reviews.find((x) => x.reviewId === Number(params.reviewId) && x.memberId === memberIdOf(request))
    if (!r) return reviewNotFound()
    db.reviews = db.reviews.filter((x) => x !== r)
    return saved(new HttpResponse(null, { status: 204 }))
  }),

  /** [목 전용] 점주 답글 */
  http.post(`${API}/user/reviews/:reviewId/reply`, async ({ params, request }) => {
    await before()
    const r = db.reviews.find((x) => x.reviewId === Number(params.reviewId))
    if (!r) return reviewNotFound()
    const store = findStore(r.storeId)
    if (store?.ownerId !== memberIdOf(request)) return reviewNotFound()
    const b = await body<{ content: string }>(request)
    if (!b.content?.trim()) return badRequest('답글 내용을 입력해주세요.')
    if (b.content.trim().length > 500) return badRequest('답글은 500자 이내로 작성해주세요.')
    r.reply = { content: b.content.trim(), createdAt: nowIso() }
    return saved(HttpResponse.json(toStoreReview(r)))
  }),

  /** [목 전용] 점주 답글 삭제 */
  http.delete(`${API}/user/reviews/:reviewId/reply`, async ({ params, request }) => {
    await before()
    const r = db.reviews.find((x) => x.reviewId === Number(params.reviewId))
    if (!r || findStore(r.storeId)?.ownerId !== memberIdOf(request)) return reviewNotFound()
    r.reply = null
    return saved(HttpResponse.json(toStoreReview(r)))
  }),
]
