import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { dayjs } from '@/shared/lib/dayjs'
import { cn } from '@/shared/lib/cn'
import styles from './Calendar.module.css'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

interface CalendarProps {
  /** YYYY-MM-DD */
  value: string | null
  onChange: (date: string) => void
  /** 선택 불가 날짜 (휴무일 등) */
  isDisabled?: (date: string) => boolean
  /** 오늘부터 며칠 뒤까지 선택 가능 */
  maxDays?: number
}

/** 예약 날짜 선택 — 셀 44×44. 선택=노랑 채움, 오늘=갈색 링, 휴무·지난 날=Disabled */
export function Calendar({ value, onChange, isDisabled, maxDays = 60 }: CalendarProps) {
  const today = dayjs().startOf('day')
  const [month, setMonth] = useState(() => (value ? dayjs(value) : today).startOf('month'))

  const start = month.startOf('month')
  const leading = start.day()
  const days = Array.from({ length: month.daysInMonth() }, (_, i) => start.add(i, 'day'))
  const lastSelectable = today.add(maxDays, 'day')

  return (
    <div className={styles.calendar}>
      <div className={styles.header}>
        <button
          type="button"
          className={styles.todayButton}
          onClick={() => {
            setMonth(today.startOf('month'))
            onChange(today.format('YYYY-MM-DD'))
          }}
        >
          오늘
        </button>
        <div className={styles.monthNav}>
          <button
            type="button"
            aria-label="이전 달"
            disabled={!month.isAfter(today, 'month')}
            onClick={() => setMonth(month.subtract(1, 'month'))}
          >
            <ChevronLeft />
          </button>
          <span className="t-headline-16" aria-live="polite">
            {month.format('YYYY년 M월')}
          </span>
          <button
            type="button"
            aria-label="다음 달"
            disabled={!month.isBefore(lastSelectable, 'month')}
            onClick={() => setMonth(month.add(1, 'month'))}
          >
            <ChevronRight />
          </button>
        </div>
        <span className={styles.spacer} />
      </div>

      <div className={styles.grid} role="grid">
        {WEEKDAYS.map((w) => (
          <span key={w} className={styles.weekday}>
            {w}
          </span>
        ))}
        {Array.from({ length: leading }, (_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {days.map((d) => {
          const key = d.format('YYYY-MM-DD')
          const disabled = d.isBefore(today) || d.isAfter(lastSelectable) || !!isDisabled?.(key)
          const selected = key === value
          const isToday = d.isSame(today, 'day')
          return (
            <button
              key={key}
              type="button"
              role="gridcell"
              aria-selected={selected}
              aria-label={d.format('M월 D일 dddd')}
              disabled={disabled}
              className={cn(styles.day, isToday && styles.today, selected && styles.selected)}
              onClick={() => onChange(key)}
            >
              {d.date()}
            </button>
          )
        })}
      </div>
    </div>
  )
}
