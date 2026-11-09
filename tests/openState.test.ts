import { describe, expect, test } from 'vitest'
import { describeNextOpen, getOpenState, type BusinessHour } from '@/entities'
import { dayjs } from '@/shared/lib/dayjs'

const hours: BusinessHour[] = (['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'] as const).map((dayOfWeek) => ({
  dayOfWeek,
  openTime: '11:30:00',
  closingTime: dayOfWeek === 'FRIDAY' ? '02:00:00' : '22:00:00',
  breakStartTime: '15:00:00',
  breakEndTime: '17:00:00',
}))

describe('getOpenState', () => {
  test('영업 중', () => {
    expect(getOpenState(hours, dayjs('2026-11-09T12:00:00')).open).toBe(true) // 월
  })
  test('오픈 전이면 오늘 오픈 시각을 알려준다', () => {
    const now = dayjs('2026-11-09T09:00:00')
    const state = getOpenState(hours, now)
    expect(state.open).toBe(false)
    expect(describeNextOpen(state.nextOpenAt!, now)).toBe('오늘은 오전 11:30부터')
  })
  test('브레이크타임에는 닫힘', () => {
    const now = dayjs('2026-11-09T15:30:00')
    const state = getOpenState(hours, now)
    expect(state.open).toBe(false)
    expect(state.nextOpenAt!.format('HH:mm')).toBe('17:00')
  })
  test('금요일 새벽 마감은 토요일 새벽까지 영업', () => {
    expect(getOpenState(hours, dayjs('2026-11-14T01:00:00')).open).toBe(true) // 토 01:00
  })
  test('주말 휴무면 다음 영업일', () => {
    const now = dayjs('2026-11-14T12:00:00') // 토
    const state = getOpenState(hours, now)
    expect(state.open).toBe(false)
    expect(describeNextOpen(state.nextOpenAt!, now)).toBe('11월 16일 (월) 오전 11:30부터')
  })
})
