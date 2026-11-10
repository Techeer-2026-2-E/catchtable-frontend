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
const MAX_SIDE_KM = 5
const MARKER_LIMIT = 1000

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

function toMapStore(s: Located, from: { lat: number; lng: number } | null): MapStore {
  const reviews = db.reviews.filter((r) => r.storeId === s.id)
  const average = reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null
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
    ratingAverage: average == null ? null : Math.round(average * 10) / 10,
    reviewCount: reviews.length,
  }
}

const num = (q: URLSearchParams, key: string) => {
  const v = q.get(key)
  return v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v)
}

/** swLat, swLng, neLat, neLng 검증 — 백엔드 MapBoundsCondition */
function readBounds(q: URLSearchParams) {
  const swLat = num(q, 'swLat')
  const swLng = num(q, 'swLng')
  const neLat = num(q, 'neLat')
  const neLng = num(q, 'neLng')
  if (swLat == null || swLng == null || neLat == null || neLng == null) return { error: badRequest('지도 범위는 필수입니다.') }
  if (swLat >= neLat || swLng >= neLng) return { error: badRequest('남서쪽 좌표는 북동쪽 좌표보다 작아야 합니다.') }
  const midLat = (swLat + neLat) / 2
  const width = distanceMeters(midLat, swLng, midLat, neLng) / 1000
  const height = distanceMeters(swLat, swLng, neLat, swLng) / 1000
  if (width > MAX_SIDE_KM || height > MAX_SIDE_KM) return { error: badRequest(`지도 범위는 한 변 ${MAX_SIDE_KM}km 이하여야 합니다.`) }
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
export const mapHandlers = [
  /** 화면 안 핀 — 최대 1000개, 넘으면 truncated */
  http.get(`${API}/user/stores/map/bounds/markers`, async ({ request }) => {
    await before()
    const { bounds, error } = readBounds(new URL(request.url).searchParams)
    if (error) return error
    const hits = locatedStores().filter((s) => inBounds(s, bounds))
    const stores: MapMarker[] = hits.slice(0, MARKER_LIMIT).map(({ id, name, latitude, longitude }) => ({ id, name, latitude, longitude }))
    return HttpResponse.json({ stores, truncated: hits.length > MARKER_LIMIT })
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
