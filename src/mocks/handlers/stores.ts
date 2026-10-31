import { http, HttpResponse } from 'msw'
import type { StoreCategory } from '@/entities'
import { STORE_CATEGORY_LABEL } from '@/entities'
import { dayjs } from '@/shared/lib/dayjs'
import { db } from '../db'
import { availability, findStore, freeTables, paginate, toStore, toStoreDetail, toStoreReview, validateBookable } from '../logic'
import { API, badRequest, before, notFound } from '../utils'

const storeNotFound = () => notFound('STORE_NOT_FOUND', '매장을 찾을 수 없습니다')

/** 고객용 매장 API — 백엔드 dev UserStoreController / StoreAvailabilityController / StoreReviewController */
export const storeHandlers = [
  http.get(`${API}/user/categories`, async () => {
    await before()
    return HttpResponse.json(
      (Object.keys(STORE_CATEGORY_LABEL) as StoreCategory[]).map((code) => ({ code, name: STORE_CATEGORY_LABEL[code] })),
    )
  }),

  /** 조건별 매장 목록 — 필터를 적용한 뒤 id순 페이지를 반환 */
  http.get(`${API}/user/stores`, async ({ request }) => {
    await before()
    const q = new URL(request.url).searchParams
    const category = q.get('category') as StoreCategory | null
    const date = q.get('date')
    const time = q.get('time')
    const partySize = Number(q.get('partySize') ?? 0) || null
    const keyword = q.get('keyword')?.trim().toLowerCase()
    const page = Number(q.get('page') ?? 0)
    const size = Number(q.get('size') ?? 10)
    if (!!date !== !!time) return badRequest('날짜와 시간은 함께 입력해야 합니다')
    if (!Number.isInteger(page) || page < 0 || !Number.isInteger(size) || size < 1 || size > 50) {
      return badRequest('페이지와 조회 개수를 확인해주세요')
    }

    const stores = db.stores.filter((s) => {
      if (category && s.category !== category) return false
      if (keyword && !s.name.toLowerCase().includes(keyword)) return false
      if ((partySize || date) && s.ownerId == null) return false
      // 이 인원을 앉힐 수 있는 운영 중 테이블이 하나라도 있는 매장만 (백엔드 filterByPartySize)
      if (
        partySize &&
        !db.tables.some((t) => t.storeId === s.id && t.status === 'ACTIVE' && t.minCapacity <= partySize && partySize <= t.capacity)
      ) {
        return false
      }
      if (date && time) {
        const at = dayjs(`${date}T${time}`)
        if (validateBookable(s, at)) return false
      }
      return true
    })
    const result = paginate(stores.sort((a, b) => a.id - b.id), new URL(request.url), 10)
    return HttpResponse.json({ stores: result.items.map(toStore), page: result.page, size: result.size, hasNext: result.hasNext })
  }),

  http.get(`${API}/user/stores/:storeId`, async ({ params }) => {
    await before()
    const store = findStore(Number(params.storeId))
    return store ? HttpResponse.json(toStoreDetail(store)) : storeNotFound()
  }),

  /** 예약 가능 시간·잔여 테이블 — 백엔드 AvailabilityResponse */
  http.get(`${API}/user/stores/:storeId/availability`, async ({ params, request }) => {
    await before()
    const store = findStore(Number(params.storeId))
    if (!store || store.ownerId == null) return storeNotFound()
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
    if (!store || store.ownerId == null) return storeNotFound()
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
