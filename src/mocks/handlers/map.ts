import { http, HttpResponse } from 'msw'
import type { MapMarker, MapStore, OpenStatus } from '@/entities'
import { STORE_CATEGORY_LABEL } from '@/entities'
import { dayjs } from '@/shared/lib/dayjs'
import { db, type StoreRow } from '../db'
import { now, openingWindow, toStoreDetail } from '../logic'
import { PUBLIC_STORES, SEED_STORE_COORDS } from '../mapData'
import { API, badRequest, before } from '../utils'

/** 백엔드 application.yml 기본값 */
const NEARBY_RADIUS_METERS = 1000
/** 지도 목록의 화면 한 변 상한 — 핀에는 적용하지 않는다 */
const MAX_SIDE_KM = 5
/** 화면 안 별점 상위 몇 개를 핀으로 줄지 (store.map.marker-limit) */
const MARKER_LIMIT = 15

type Located = StoreRow & { latitude: number; longitude: number }

/** 좌표가 있는 매장 전체 — 시드 매장 + 공공데이터 매장 */
function locatedStores(): Located[] {
  const seeded = db.stores.flatMap((s) => {
    const c = SEED_STORE_COORDS[s.id]
    return c ? [{ ...s, latitude: c[0], longitude: c[1] }] : []
  })
  return [...seeded, ...PUBLIC_STORES]
}

const rad = (d: number) => (d * Math.PI) / 180
function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const h = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h))
}

const fmt = (d: dayjs.Dayjs) => d.format('YYYY-MM-DDTHH:mm:ss')

/** 백엔드 StoreOpenStatusCalculator 와 같은 규칙 — 영업시간이 없으면 null */
function openState(store: StoreRow): { openStatus: OpenStatus | null; nextChangeAt: string | null } {
  if (store.businessHours.length === 0 && !store.specialDays?.length) return { openStatus: null, nextChangeAt: null }
  const at = now()
  for (const d of [at.subtract(1, 'day'), at]) {
    const w = openingWindow(store, d.format('YYYY-MM-DD'))
    if (!w || at.isBefore(w.start) || !at.isBefore(w.end)) continue
    if (w.breakTime && !at.isBefore(w.breakTime.start) && at.isBefore(w.breakTime.end)) {
      return { openStatus: 'BREAK', nextChangeAt: fmt(w.breakTime.end) }
    }
    if (w.breakTime && at.isBefore(w.breakTime.start)) return { openStatus: 'OPEN', nextChangeAt: fmt(w.breakTime.start) }
    return { openStatus: 'OPEN', nextChangeAt: fmt(w.end) }
  }
  const today = openingWindow(store, at.format('YYYY-MM-DD'))
  if (today && at.isBefore(today.start)) return { openStatus: 'BEFORE_OPEN', nextChangeAt: fmt(today.start) }
  for (let i = 1; i <= 7; i++) {
    const w = openingWindow(store, at.add(i, 'day').format('YYYY-MM-DD'))
    if (w) return { openStatus: 'CLOSED', nextChangeAt: fmt(w.start) }
  }
  return { openStatus: 'CLOSED', nextChangeAt: null }
}

/** 매장 리뷰 수와 평균 (평균은 반올림 전, 리뷰가 없으면 null) */
function reviewStats(storeId: number) {
  const reviews = db.reviews.filter((r) => r.storeId === storeId)
  return { count: reviews.length, average: reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null }
}
const round1 = (v: number | null) => (v == null ? null : Math.round(v * 10) / 10)

function toMapStore(s: Located, from: { lat: number; lng: number } | null): MapStore {
  const stats = reviewStats(s.id)
  return {
    id: s.id,
    name: s.name,
    categoryName: STORE_CATEGORY_LABEL[s.category],
    imageUrl: s.imageUrl ?? null,
    latitude: s.latitude,
    longitude: s.longitude,
    area: s.address.split(' ').find((w) => w.endsWith('구')) ?? null,
    distanceMeters: from ? Math.round(distanceMeters(from.lat, from.lng, s.latitude, s.longitude)) : null,
    reservationEnabled: s.ownerId != null,
    waitingAvailable: s.waitingAvailable && s.waitingSettings.open,
    ...openState(s),
    ratingAverage: round1(stats.average),
    reviewCount: stats.count,
  }
}

const num = (q: URLSearchParams, key: string) => {
  const v = q.get(key)
  return v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v)
}

/** swLat, swLng, neLat, neLng 검증 — 백엔드 MapBoundsCondition. limitSize 면 한 변 상한도 검사 (목록만) */
function readBounds(q: URLSearchParams, limitSize = true) {
  const swLat = num(q, 'swLat')
  const swLng = num(q, 'swLng')
  const neLat = num(q, 'neLat')
  const neLng = num(q, 'neLng')
  if (swLat == null || swLng == null || neLat == null || neLng == null) return { error: badRequest('지도 범위는 필수입니다.') }
  if (swLat >= neLat || swLng >= neLng) return { error: badRequest('남서쪽 좌표는 북동쪽 좌표보다 작아야 합니다.') }
  const midLat = (swLat + neLat) / 2
  const width = distanceMeters(midLat, swLng, midLat, neLng) / 1000
  const height = distanceMeters(swLat, swLng, neLat, swLng) / 1000
  if (limitSize && (width > MAX_SIDE_KM || height > MAX_SIDE_KM)) return { error: badRequest(`지도 범위는 한 변 ${MAX_SIDE_KM}km 이하여야 합니다.`) }
  return { bounds: { swLat, swLng, neLat, neLng } }
}

function readPage(q: URLSearchParams) {
  const page = num(q, 'page') ?? 0
  const size = num(q, 'size') ?? 10
  if (!Number.isInteger(page) || page < 0 || !Number.isInteger(size) || size < 1 || size > 50) return null
  return { page, size }
}

const inBounds = (s: Located, b: { swLat: number; swLng: number; neLat: number; neLng: number }) =>
  s.latitude >= b.swLat && s.latitude <= b.neLat && s.longitude >= b.swLng && s.longitude <= b.neLng

function pageOf(stores: MapStore[], { page, size }: { page: number; size: number }) {
  const items = stores.slice(page * size, page * size + size)
  return { stores: items, page, size, hasNext: (page + 1) * size < stores.length }
}

const publicStore = (id: number) => PUBLIC_STORES.find((s) => s.id === id)

/** 지도 매장 API — 백엔드 feat/266-map-stores (UserStoreController). dev 에는 아직 없음 */
/** 최근 30일 예약(확정, 완료) + 웨이팅 입장 수 — 백엔드 StorePopularityService (가중치 1:1) */
function popularityOf(storeId: number) {
  const since = dayjs().subtract(30, 'day')
  const reservations = db.reservations.filter(
    (r) => r.storeId === storeId && (r.status === 'CONFIRMED' || r.status === 'COMPLETED') && dayjs(r.requestedAt).isAfter(since),
  ).length
  const waitings = db.waitings.filter((w) => w.storeId === storeId && w.status === 'SEATED' && dayjs(w.createdAt).isAfter(since)).length
  return reservations + waitings
}

export const mapHandlers = [
  /**
   * 홈 주변 매장 — 반경 1km. sort=POPULAR 면 인기 점수 높은 순(없으면 0점), 같으면 id 순. 아니면 가까운 순
   * 응답은 NearbyStoreResponse (별점, 영업 상태 없음)
   */
  http.get(`${API}/user/stores/home`, async ({ request }) => {
    await before()
    const q = new URL(request.url).searchParams
    const lat = num(q, 'lat')
    const lng = num(q, 'lng')
    if (lat == null || lng == null) return badRequest('현재 위치는 필수입니다.')
    const paging = readPage(q)
    if (!paging) return badRequest('페이지와 조회 개수를 확인해주세요')
    const sort = q.get('sort')
    if (sort && sort !== 'POPULAR') return badRequest('정렬 값을 확인해주세요')
    const nearby = locatedStores()
      .map((s) => ({ s, m: toMapStore(s, { lat, lng }) }))
      .filter(({ m }) => m.distanceMeters! <= NEARBY_RADIUS_METERS)
    const scored = nearby.map((x) => ({ ...x, score: sort ? popularityOf(x.s.id) : 0 }))
    scored.sort((a, b) => (sort ? b.score - a.score || a.s.id - b.s.id : a.m.distanceMeters! - b.m.distanceMeters! || a.s.id - b.s.id))
    const { page, size } = paging
    const slice = scored.slice(page * size, page * size + size)
    return HttpResponse.json({
      stores: slice.map(({ s, m }) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        categoryName: m.categoryName,
        address: s.address,
        waitingAvailable: m.waitingAvailable,
        imageUrl: m.imageUrl,
        distanceMeters: m.distanceMeters,
      })),
      page,
      size,
      hasNext: scored.length > page * size + size,
    })
  }),
  /**
   * 화면 안 핀 — 크기 제한 없이 별점 상위 15개 (MapBoundsRepository.FIND_MARKERS_SQL)
   * 평균 높은 순, 같으면 리뷰 많은 순, 리뷰 없는 매장은 맨 뒤, 그다음 id 순. 순서가 곧 rank
   */
  http.get(`${API}/user/stores/map/bounds/markers`, async ({ request }) => {
    await before()
    const { bounds, error } = readBounds(new URL(request.url).searchParams, false)
    if (error) return error
    const ranked = locatedStores()
      .filter((s) => inBounds(s, bounds))
      .map((s) => ({ store: s, stats: reviewStats(s.id) }))
      .sort((a, b) => {
        const av = a.stats.average
        const bv = b.stats.average
        if (av == null || bv == null) {
          if (av != null) return -1
          if (bv != null) return 1
        } else if (av !== bv) return bv - av
        return b.stats.count - a.stats.count || a.store.id - b.store.id
      })
    const stores: MapMarker[] = ranked.slice(0, MARKER_LIMIT).map(({ store, stats }, i) => ({
      id: store.id,
      name: store.name,
      latitude: store.latitude,
      longitude: store.longitude,
      ratingAverage: round1(stats.average),
      reviewCount: stats.count,
      rank: i + 1,
    }))
    return HttpResponse.json({ stores })
  }),

  /** 화면 안 매장 목록 — (lat, lng) 에서 가까운 순 */
  http.get(`${API}/user/stores/map/bounds`, async ({ request }) => {
    await before()
    const q = new URL(request.url).searchParams
    const { bounds, error } = readBounds(q)
    if (error) return error
    const lat = num(q, 'lat')
    const lng = num(q, 'lng')
    if (lat == null || lng == null) return badRequest('현재 위치는 필수입니다.')
    const paging = readPage(q)
    if (!paging) return badRequest('페이지와 조회 개수를 확인해주세요')
    const stores = locatedStores()
      .filter((s) => inBounds(s, bounds))
      .map((s) => toMapStore(s, { lat, lng }))
      .sort((a, b) => a.distanceMeters! - b.distanceMeters! || a.id - b.id)
    return HttpResponse.json(pageOf(stores, paging))
  }),

  /** 내 위치 반경 매장 */
  http.get(`${API}/user/stores/map/radius`, async ({ request }) => {
    await before()
    const q = new URL(request.url).searchParams
    const lat = num(q, 'lat')
    const lng = num(q, 'lng')
    if (lat == null || lng == null) return badRequest('현재 위치는 필수입니다.')
    const paging = readPage(q)
    if (!paging) return badRequest('페이지와 조회 개수를 확인해주세요')
    const stores = locatedStores()
      .map((s) => toMapStore(s, { lat, lng }))
      .filter((s) => s.distanceMeters! <= NEARBY_RADIUS_METERS)
      .sort((a, b) => a.distanceMeters! - b.distanceMeters! || a.id - b.id)
    return HttpResponse.json(pageOf(stores, paging))
  }),

  /** 공공데이터 매장 상세 — 시드 매장이 아니면 아래 storeHandlers 로 넘긴다 */
  http.get(`${API}/user/stores/:storeId`, async ({ params }) => {
    const store = publicStore(Number(params.storeId))
    if (!store) return
    await before()
    return HttpResponse.json(toStoreDetail(store))
  }),
  http.get(`${API}/user/stores/:storeId/reviews`, async ({ params, request }) => {
    if (!publicStore(Number(params.storeId))) return
    await before()
    const url = new URL(request.url)
    return HttpResponse.json({
      averageRating: null,
      reviewCount: 0,
      reviews: [],
      page: Number(url.searchParams.get('page') ?? 0),
      size: Number(url.searchParams.get('size') ?? 20),
      hasNext: false,
    })
  }),
]
