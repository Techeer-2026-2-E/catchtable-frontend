import { OPEN_STATUS_LABEL, type MapStore } from '@/entities'
import { dayjs } from '@/shared/lib/dayjs'

/** 다음 바뀌는 시각을 "오늘이면 시각만, 내일이면 내일, 그 밖은 날짜" 로 */
function when(at: string, base = dayjs()) {
  const d = dayjs(at)
  const days = d.startOf('day').diff(base.startOf('day'), 'day')
  const time = d.format('HH:mm')
  if (days <= 0) return time
  if (days === 1) return `내일 ${time}`
  return `${d.format('M/D(dd)')} ${time}`
}

/**
 * 지도 매장의 영업 상태 한 줄 — { label: "영업 중", detail: "22:00까지" }
 * 영업시간 정보가 없으면 null
 */
export function describeOpenStatus(store: Pick<MapStore, 'openStatus' | 'nextChangeAt'>, base = dayjs()) {
  if (!store.openStatus) return null
  const label = OPEN_STATUS_LABEL[store.openStatus]
  if (!store.nextChangeAt) return { label, detail: null, open: store.openStatus === 'OPEN' }
  const at = when(store.nextChangeAt, base)
  const detail = {
    OPEN: `${at}까지`,
    BREAK: `${at} 영업 재개`,
    BEFORE_OPEN: `${at} 영업 시작`,
    CLOSED: `${at} 영업 시작`,
  }[store.openStatus]
  return { label, detail, open: store.openStatus === 'OPEN' }
}
