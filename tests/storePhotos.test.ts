import { describe, expect, it } from 'vitest'
import { getStoreImageSrc, getStorePhotos } from '@/entities'
import { readMapFocus, toMapStore } from '@/features/store-map'

describe('매장 목 사진', () => {
  it('실제 사진이 있으면 그 사진을 쓴다', () => {
    expect(getStoreImageSrc({ id: 1, imageUrl: 'https://img.test/a.jpg', category: 'KOREAN' })).toBe('https://img.test/a.jpg')
  })

  it('사진이 없으면 같은 매장은 늘 같은 카테고리 사진을 받는다', () => {
    const a = getStoreImageSrc({ id: 47723, imageUrl: null, category: 'KOREAN' })
    expect(a).toMatch(/^\/images\/stores\/photos\/korean-\d{2}\.webp$/)
    expect(getStoreImageSrc({ id: 47723, imageUrl: null, category: 'KOREAN' })).toBe(a)
  })

  it('카테고리 코드가 없으면 이름으로, id 도 없으면 기본 그림으로', () => {
    expect(getStoreImageSrc({ id: 3, imageUrl: null, categoryName: '카페' })).toMatch(/\/photos\/cafe-/)
    expect(getStoreImageSrc({ imageUrl: null, category: 'BAR' })).toBe('/images/stores/bar.svg')
  })

  it('이웃 매장끼리 사진이 고르게 퍼진다', () => {
    const used = new Set(Array.from({ length: 40 }, (_, i) => getStoreImageSrc({ id: 1000 + i, imageUrl: null, category: 'JAPANESE' })))
    expect(used.size).toBeGreaterThanOrEqual(7)
  })

  it('상세 사진은 겹치지 않고, 실제 사진이 맨 앞', () => {
    const photos = getStorePhotos({ id: 9, imageUrl: null, category: 'KOREAN' })
    expect(photos).toHaveLength(4)
    expect(new Set(photos).size).toBe(4)
    expect(getStorePhotos({ id: 9, imageUrl: 'https://img.test/a.jpg', category: 'KOREAN' })[0]).toBe('https://img.test/a.jpg')
  })
})

describe('지도 진입 위치', () => {
  const q = (s: string) => new URLSearchParams(s)

  it('매장과 좌표를 함께 읽는다', () => {
    expect(readMapFocus(q('storeId=47723&lat=37.55&lng=126.92'))).toEqual({ storeId: 47723, point: { lat: 37.55, lng: 126.92 } })
  })

  it('좌표만 있으면 그 지점만', () => {
    expect(readMapFocus(q('lat=37.5&lng=127'))).toEqual({ storeId: null, point: { lat: 37.5, lng: 127 } })
  })

  it('좌표가 없거나 잘못되면 무시한다', () => {
    expect(readMapFocus(q('storeId=1'))).toBeNull()
    expect(readMapFocus(q('lat=abc&lng=127'))).toBeNull()
    expect(readMapFocus(q('lat=95&lng=127'))).toBeNull()
    expect(readMapFocus(q('lat=37.5&lng=127&storeId=-3'))?.storeId).toBeNull()
  })
})

describe('검색 매장 → 지도 목록 한 칸', () => {
  const base = { id: 1, name: '김장독', category: 'KOREAN' as const, categoryName: '한식', address: '서울 마포구', waitingAvailable: true, imageUrl: null }

  it('좌표와 내 위치가 있으면 거리를 m 로 계산한다', () => {
    const item = toMapStore({ ...base, latitude: 37.4989, longitude: 127.0276, ratingAverage: 4.5, reviewCount: 3, openStatus: 'OPEN' }, { lat: 37.4979, lng: 127.0276 })
    expect(item.distanceMeters).toBeGreaterThan(100)
    expect(item.distanceMeters).toBeLessThan(120)
    expect(item.ratingAverage).toBe(4.5)
    expect(item.openStatus).toBe('OPEN')
  })

  it('예전 서버처럼 값이 없으면 숨김용 값으로 둔다', () => {
    const item = toMapStore(base, { lat: 37.4979, lng: 127.0276 })
    expect(item.distanceMeters).toBeNull()
    expect(item.ratingAverage).toBeNull()
    expect(item.reviewCount).toBe(0)
    expect(item.openStatus).toBeNull()
    expect(item.reservationEnabled).toBe(false)
  })
})
