import { http, HttpResponse } from 'msw'
import type { StoreCategory } from '@/entities'
import { STORE_CATEGORY_LABEL } from '@/entities'
import { dayjs } from '@/shared/lib/dayjs'
import { db } from '../db'
import { availability, distanceMeters, findStore, freeTables, paginate, toStore, toStoreReview, toStoreDetail, validateBookable } from '../logic'
import { API, badRequest, before, notFound } from '../utils'

const storeNotFound = () => notFound('STORE_NOT_FOUND', '매장을 찾을 수 없습니다')

/** 고객용 매장 API — 백엔드 dev UserStoreController / StoreAvailabilityController + 노션 명세 */
export const storeHandlers = [
  http.get(`${API}/user/categories`, async () => {
    await before()
    return HttpResponse.json(
      (Object.keys(STORE_CATEGORY_LABEL) as StoreCategory[]).map((code) => ({ code, name: STORE_CATEGORY_LABEL[code] })),
    )
  }),

  /** 조건별 매장 목록 — category, date+time(함께), partySize (+ 목 전용 keyword, waitingAvailable) */
  http.get(`${API}/user/stores`, async ({ request }) => {
    await before()
    const q = new URL(request.url).searchParams
    const category = q.get('category') as StoreCategory | null
    const date = q.get('date')
    const time = q.get('time')
    const partySize = Number(q.get('partySize') ?? 0) || null
    const keyword = q.get('keyword')?.trim()
    const waitingOnly = q.get('waitingAvailable') === 'true'
    if (!!date !== !!time) return badRequest('날짜와 시간은 함께 입력해야 합니다')

    const stores = db.stores.filter((s) => {
      if (category && s.category !== category) return false
      if (waitingOnly && !(s.waitingAvailable && s.waitingSettings.open)) return false
      if (keyword && ![s.name, s.region, s.address, STORE_CATEGORY_LABEL[s.category]].some((v) => v?.includes(keyword))) {
        return false
      }
      if (partySize && s.maxPartySize && partySize > s.maxPartySize) return false
      if (date && time) {
        const at = dayjs(`${date}T${time}`)
        if (validateBookable(s, at) || freeTables(s, at, partySize ?? 2).length === 0) return false
      }
      return true
    })
    return HttpResponse.json(stores.map((s) => toStore(s)))
  }),

  /** P2: 주변·인기 매장 (노션 명세, 응답은 제안) */
  http.get(`${API}/user/stores/home`, async ({ request }) => {
    await before()
    const q = new URL(request.url).searchParams
    const lat = Number(q.get('latitude'))
    const lng = Number(q.get('longitude'))
    const hasPosition = Number.isFinite(lat) && Number.isFinite(lng) && q.has('latitude')
    const nearby = hasPosition
      ? db.stores
          .filter((s) => s.latitude != null && s.longitude != null)
          .map((s) => toStore(s, distanceMeters(lat, lng, s.latitude!, s.longitude!)))
          .sort((a, b) => a.distanceMeters! - b.distanceMeters!)
          .slice(0, 6)
      : []
    const popular = db.stores
      .map((s) => toStore(s))
      .sort((a, b) => (b.rating ?? 0) * 10 + (b.reviewCount ?? 0) / 10 - ((a.rating ?? 0) * 10 + (a.reviewCount ?? 0) / 10))
    const waitingNow = db.stores.filter((s) => s.waitingAvailable && s.waitingSettings.open).map((s) => toStore(s))
    return HttpResponse.json({ nearby, popular, waitingNow })
  }),

  http.get(`${API}/user/stores/:storeId`, async ({ params }) => {
    await before()
    const store = findStore(Number(params.storeId))
    return store ? HttpResponse.json(toStoreDetail(store)) : storeNotFound()
  }),

  http.get(`${API}/user/stores/:storeId/menus`, async ({ params }) => {
    await before()
    const storeId = Number(params.storeId)
    if (!findStore(storeId)) return storeNotFound()
    return HttpResponse.json(db.menus.filter((m) => m.storeId === storeId).map(({ storeId: _s, ...m }) => m))
  }),

  /** 예약 가능 시간·잔여 테이블 — 백엔드 AvailabilityResponse */
  http.get(`${API}/user/stores/:storeId/availability`, async ({ params, request }) => {
    await before()
    const store = findStore(Number(params.storeId))
    if (!store) return storeNotFound()
    const q = new URL(request.url).searchParams
    const date = q.get('date')
    const partySize = Number(q.get('partySize'))
    if (!date || !partySize) return badRequest('date 와 partySize 는 필수입니다.')
    return HttpResponse.json({ storeId: store.id, date, partySize, slots: availability(store, date, partySize) })
  }),

  /** 특정 시각 잔여 테이블 수 — 백엔드 AvailableTableCountResponse */
  http.get(`${API}/user/stores/:storeId/tables`, async ({ params, request }) => {
    await before()
    const store = findStore(Number(params.storeId))
    if (!store) return storeNotFound()
    const q = new URL(request.url).searchParams
    const startAt = q.get('reservationStartAt')
    const partySize = Number(q.get('partySize'))
    if (!startAt || !partySize) return badRequest('reservationStartAt 과 partySize 는 필수입니다.')
    const at = dayjs(startAt)
    const count = validateBookable(store, at) ? 0 : freeTables(store, at, partySize).length
    return HttpResponse.json({ storeId: store.id, reservationStartAt: startAt, partySize, availableTableCount: count })
  }),

  /** 매장 리뷰 — StoreReviewListResponse (sort=LATEST|RATING, page, size) */
  http.get(`${API}/user/stores/:storeId/reviews`, async ({ params, request }) => {
    await before()
    const storeId = Number(params.storeId)
    if (!findStore(storeId)) return storeNotFound()
    const url = new URL(request.url)
    const sort = url.searchParams.get('sort')
    const reviews = db.reviews
      .filter((r) => r.storeId === storeId)
      .sort((a, b) => (sort === 'RATING' ? b.rating - a.rating : 0) || b.createdAt.localeCompare(a.createdAt))
    const average = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null
    const { items, page, size, hasNext } = paginate(reviews, url)
    return HttpResponse.json({
      averageRating: average == null ? null : Math.round(average * 10) / 10,
      reviewCount: reviews.length,
      reviews: items.map(toStoreReview),
      page,
      size,
      hasNext,
    })
  }),
]
