import { dayjs } from '@/shared/lib/dayjs'
import { toDayOfWeek, type BusinessHour } from './model'

type Dayjs = ReturnType<typeof dayjs>

/** 하루의 영업 구간 — 브레이크타임은 빼고, 마감이 오픈보다 이르면 다음날 마감 (백엔드 BusinessHourService 와 같은 규칙) */
function windowsOf(hours: BusinessHour[], date: Dayjs): [Dayjs, Dayjs][] {
  const h = hours.find((x) => x.dayOfWeek === toDayOfWeek(date.day()))
  if (!h) return []
  const day = date.format('YYYY-MM-DD')
  const open = dayjs(`${day}T${h.openTime}`)
  const at = (time: string) => {
    const value = dayjs(`${day}T${time}`)
    return value.isAfter(open) ? value : value.add(1, 'day')
  }
  const close = at(h.closingTime)
  if (!h.breakStartTime || !h.breakEndTime) return [[open, close]]
  return [
    [open, at(h.breakStartTime)],
    [at(h.breakEndTime), close],
  ]
}

/**
 * 지금 영업 중인지와 다음 영업 시작 시각 (7일 안) — 요일별 영업시간 기준이라
 * 특정일 휴무·변경은 반영되지 않는다. 최종 판단은 서버(WAITING_OUTSIDE_BUSINESS_HOURS)
 */
export function getOpenState(hours: BusinessHour[], now: Dayjs = dayjs()) {
  const today = now.startOf('day')
  const windows = [-1, 0, 1, 2, 3, 4, 5, 6, 7].flatMap((d) => windowsOf(hours, today.add(d, 'day')))
  const open = windows.some(([start, end]) => !now.isBefore(start) && now.isBefore(end))
  const nextOpenAt = open ? null : (windows.map(([start]) => start).filter((start) => start.isAfter(now)).sort((a, b) => a.diff(b))[0] ?? null)
  return { open, nextOpenAt }
}

/** "오늘은 오전 11:30부터", "내일 오후 5:00부터", "11월 12일 (목) 오전 11:30부터" */
export function describeNextOpen(nextOpenAt: Dayjs, now: Dayjs = dayjs()) {
  const time = nextOpenAt.format('A h:mm')
  if (nextOpenAt.isSame(now, 'day')) return `오늘은 ${time}부터`
  if (nextOpenAt.isSame(now.add(1, 'day'), 'day')) return `내일 ${time}부터`
  return `${nextOpenAt.format('M월 D일 (dd)')} ${time}부터`
}
