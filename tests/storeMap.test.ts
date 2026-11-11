import { describe, expect, it } from 'vitest'
import { boundsSideKm, describeOpenStatus, formatDistance, isSearchable, nearlySameBounds } from '@/features/store-map'
import { dayjs } from '@/shared/lib/dayjs'

// 강남역 주변 약 1.8km × 1.1km
const gangnam = { swLat: 37.4929, swLng: 127.0176, neLat: 37.5029, neLng: 127.0376 }

describe('지도 범위', () => {
  it('한 변 길이를 km 로 잰다', () => {
    const { width, height } = boundsSideKm(gangnam)
    expect(width).toBeGreaterThan(1.7)
    expect(width).toBeLessThan(1.8)
    expect(height).toBeGreaterThan(1.1)
    expect(height).toBeLessThan(1.12)
  })

  it('한 변이 5km 를 넘으면 검색할 수 없다 (백엔드 store.map.max-side-km)', () => {
    expect(isSearchable(gangnam)).toBe(true)
    expect(isSearchable({ ...gangnam, neLng: gangnam.swLng + 0.06 })).toBe(false)
    expect(isSearchable({ ...gangnam, neLat: gangnam.swLat + 0.05 })).toBe(false)
  })

  it('조금만 움직이면 같은 범위로 본다', () => {
    const nudge = { ...gangnam, swLng: gangnam.swLng + 0.001, neLng: gangnam.neLng + 0.001 }
    const far = { ...gangnam, swLng: gangnam.swLng + 0.01, neLng: gangnam.neLng + 0.01 }
    expect(nearlySameBounds(gangnam, nudge)).toBe(true)
    expect(nearlySameBounds(gangnam, far)).toBe(false)
  })
})

describe('거리 표시', () => {
  it('1km 미만은 10m 단위, 이상은 km 소수 첫째 자리', () => {
    expect(formatDistance(null)).toBeNull()
    expect(formatDistance(347)).toBe('350m')
    expect(formatDistance(1234)).toBe('1.2km')
  })
})

describe('지도 매장 영업 상태', () => {
  const base = dayjs('2026-11-10T14:00:00')

  it('영업 상태가 없으면 null', () => {
    expect(describeOpenStatus({ openStatus: null, nextChangeAt: null }, base)).toBeNull()
  })

  it('영업 중이면 다음 바뀌는 시각까지', () => {
    expect(describeOpenStatus({ openStatus: 'OPEN', nextChangeAt: '2026-11-10T22:00:00' }, base)).toEqual({
      label: '영업 중',
      detail: '22:00까지',
      open: true,
    })
  })

  it('새벽 마감은 내일로 표시', () => {
    expect(describeOpenStatus({ openStatus: 'OPEN', nextChangeAt: '2026-11-11T02:00:00' }, base)?.detail).toBe('내일 02:00까지')
  })

  it('브레이크타임, 영업 전, 영업 종료', () => {
    expect(describeOpenStatus({ openStatus: 'BREAK', nextChangeAt: '2026-11-10T17:00:00' }, base)?.detail).toBe('17:00 영업 재개')
    expect(describeOpenStatus({ openStatus: 'BEFORE_OPEN', nextChangeAt: '2026-11-10T17:00:00' }, base)?.detail).toBe('17:00 영업 시작')
    const closed = describeOpenStatus({ openStatus: 'CLOSED', nextChangeAt: '2026-11-12T11:00:00' }, base)
    expect(closed?.label).toBe('영업 종료')
    expect(closed?.detail).toMatch(/^11\/12\(.\) 11:00 영업 시작$/)
  })
})
