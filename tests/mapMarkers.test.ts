import { getResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { MapMarkerList } from '@/entities'
import { mapHandlers } from '@/mocks/handlers/map'
import { createPinElement } from '@/shared/ui/map/pinElement'
import { pinLook } from '@/shared/ui/map/pinLook'

// 서울 대부분 (한 변 20km 넘음) — 목록은 막히고 핀은 나와야 한다
const SEOUL = { swLat: 37.43, swLng: 126.8, neLat: 37.7, neLng: 127.18 }
const call = (path: string, params: Record<string, number>) => {
  const url = new URL(`/api${path}`, location.href)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))
  return getResponse(mapHandlers, new Request(url))
}

describe('지도 핀 API (목)', () => {
  it('화면이 넓어도 별점 상위 15개를 순위와 함께 준다', async () => {
    const res = await call('/user/stores/map/bounds/markers', SEOUL)
    expect(res?.status).toBe(200)
    const body = (await res!.json()) as MapMarkerList
    expect(body).not.toHaveProperty('truncated')
    expect(body.stores.length).toBeGreaterThan(0)
    expect(body.stores.length).toBeLessThanOrEqual(15)
    expect(body.stores.map((m) => m.rank)).toEqual(body.stores.map((_, i) => i + 1))

    // 별점 높은 순, 리뷰 없는 매장(null)은 뒤로
    const ratings = body.stores.map((m) => m.ratingAverage)
    const firstNull = ratings.indexOf(null)
    const rated = (firstNull === -1 ? ratings : ratings.slice(0, firstNull)) as number[]
    expect(rated).toEqual([...rated].sort((a, b) => b - a))
    if (firstNull !== -1) expect(ratings.slice(firstNull).every((r) => r == null)).toBe(true)
  })

  it('같은 넓은 화면의 목록은 여전히 400 (한 변 5km)', async () => {
    const res = await call('/user/stores/map/bounds', { ...SEOUL, lat: 37.5, lng: 127 })
    expect(res?.status).toBe(400)
  })
})

describe('지도 핀 모양', () => {
  const base = { id: 1, lat: 37.5, lng: 127, label: '혼술 이자카야' }

  it('상위 매장은 점 대신 이름과 별점 박스', () => {
    const el = createPinElement({ ...base, featured: true, rating: 4.6, rank: 1 }, () => {})
    expect(el.textContent).toBe('혼술 이자카야★4.6')
    expect(el.getAttribute('aria-label')).toBe('혼술 이자카야, 별점 4.6')
  })

  it('별점이 없으면 이름만, 일반 핀은 선택 전까지 글자 없음', () => {
    expect(createPinElement({ ...base, featured: true, rating: null, rank: 2 }, () => {}).textContent).toBe('혼술 이자카야')
    expect(createPinElement({ ...base, rank: 5 }, () => {}).textContent).toBe('')
    expect(createPinElement({ ...base, rank: 5, selected: true }, () => {}).textContent).toBe('혼술 이자카야')
  })

  it('순위가 높을수록 위에 겹치고, 고른 핀이 맨 위', () => {
    const z = (rank: number, selected = false) => pinLook({ ...base, rank, selected }).zIndex
    expect(z(1)).toBeGreaterThan(z(2))
    expect(z(3)).toBeGreaterThan(z(15))
    expect(z(15, true)).toBeGreaterThan(z(1))
  })
})
