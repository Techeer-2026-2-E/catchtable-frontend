import { getResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { NearbyStoreList } from '@/entities'
import { mapHandlers } from '@/mocks/handlers/map'

// 강남역
const call = (query: Record<string, string>) => {
  const url = new URL('/api/user/stores/home', location.href)
  Object.entries({ lat: '37.4979', lng: '127.0276', ...query }).forEach(([k, v]) => url.searchParams.set(k, v))
  return getResponse(mapHandlers, new Request(url))
}

describe('홈 주변 매장 (목)', () => {
  it('기본은 가까운 순', async () => {
    const body = (await (await call({}))!.json()) as NearbyStoreList
    const d = body.stores.map((s) => s.distanceMeters)
    expect(d).toEqual([...d].sort((a, b) => a - b))
    expect(d.every((m) => m <= 1000)).toBe(true)
  })

  it('sort=POPULAR 는 같은 반경 매장을 인기순으로, 잘못된 정렬 값은 400', async () => {
    const near = (await (await call({ size: '50' }))!.json()) as NearbyStoreList
    const popular = (await (await call({ sort: 'POPULAR', size: '50' }))!.json()) as NearbyStoreList
    expect(new Set(popular.stores.map((s) => s.id))).toEqual(new Set(near.stores.map((s) => s.id)))
    expect((await call({ sort: 'RATING' }))?.status).toBe(400)
  })
})
