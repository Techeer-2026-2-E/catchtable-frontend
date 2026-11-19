import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { KakaoMapView } from '@/shared/ui/map/KakaoMapView'
import type { KakaoMaps } from '@/shared/ui/map/kakaoLoader'
import type { MapPin } from '@/shared/ui/map/types'

/** 핀을 몇 번 만들고 지웠는지만 세는 가짜 카카오맵 SDK */
function fakeMaps() {
  const created: string[] = []
  let removed = 0
  const point = (lat: number, lng: number) => ({ getLat: () => lat, getLng: () => lng })
  class FakeMap {
    getBounds = () => ({ getSouthWest: () => point(0, 0), getNorthEast: () => point(1, 1) })
    getCenter = () => point(0.5, 0.5)
    getLevel = () => 4
    getProjection = () => ({ containerPointFromCoords: () => ({ x: 0, y: 0 }), coordsFromContainerPoint: () => point(0, 0) })
    setCenter = () => {}
    panTo = () => {}
    relayout = () => {}
  }
  class FakeOverlay {
    constructor(options: { content: HTMLElement }) {
      created.push(options.content.getAttribute('aria-label') ?? '')
    }
    setMap(map: unknown) {
      if (map === null) removed += 1
    }
  }
  const maps = {
    load: (cb: () => void) => cb(),
    LatLng: function (lat: number, lng: number) {
      return point(lat, lng)
    },
    Point: function (x: number, y: number) {
      return { x, y }
    },
    Map: FakeMap,
    CustomOverlay: FakeOverlay,
    event: { addListener: () => {}, removeListener: () => {} },
  } as unknown as KakaoMaps
  return { maps, created, removed: () => removed }
}

const PINS: MapPin[] = Array.from({ length: 200 }, (_, i) => ({ id: i + 1, lat: 37.5 + i * 0.0001, lng: 127, label: `매장 ${i + 1}` }))
const select = (id: number | null) => PINS.map((p) => ({ ...p, selected: p.id === id }))

describe('카카오맵 핀', () => {
  it('핀을 고르면 전체가 아니라 바뀐 핀만 다시 그린다', () => {
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
    const { maps, created, removed } = fakeMaps()
    const props = { maps, initialCenter: { lat: 37.5, lng: 127 }, onIdle: () => {}, onPinClick: () => {} }
    const view = render(<KakaoMapView {...props} pins={select(null)} />)
    expect(created).toHaveLength(200)

    // 3번을 고름 — 3번 하나만 다시
    view.rerender(<KakaoMapView {...props} pins={select(3)} />)
    expect(created.slice(200)).toEqual(['매장 3'])
    expect(removed()).toBe(1)

    // 7번으로 바꿈 — 이전 선택(3)과 새 선택(7) 두 개만
    view.rerender(<KakaoMapView {...props} pins={select(7)} />)
    expect(created.slice(201).sort()).toEqual(['매장 3', '매장 7'])
    expect(removed()).toBe(3)

    // 검색 범위가 바뀌어 핀이 줄면 빠진 핀만 지운다
    view.rerender(<KakaoMapView {...props} pins={select(7).slice(0, 150)} />)
    expect(created).toHaveLength(203)
    expect(removed()).toBe(53)

    // 화면을 떠나면 남은 핀을 모두 정리
    view.unmount()
    expect(removed()).toBe(203)
    vi.unstubAllGlobals()
  })
})
