import { useState } from 'react'
import { useParams } from 'react-router'
import { DAY_OF_WEEK_LABEL, DAYS_OF_WEEK, type BusinessHour, type DayOfWeek } from '@/entities'
import { useBusinessHours, useReplaceBusinessHours, type BusinessHourRequest } from '@/features/owner-store'
import { getErrorMessage } from '@/shared/lib'
import { Banner, Button, ErrorState, LoadingState, Page, Section, toast, Toggle, TopBar } from '@/shared/ui'
import styles from './OwnerHoursPage.module.css'

/** 화면 편집용 — 휴무 요일도 시간 값을 유지해서 다시 켜면 복원되게 함 */
interface DayRow {
  dayOfWeek: DayOfWeek
  open: boolean
  openTime: string
  closingTime: string
}
interface BreakTime {
  enabled: boolean
  start: string
  end: string
}

const hhmm = (time: string) => time.slice(0, 5)

function toForm(hours: BusinessHour[]): { rows: DayRow[]; breakTime: BreakTime } {
  const fallback = hours[0]
  const rows = DAYS_OF_WEEK.map((day) => {
    const h = hours.find((x) => x.dayOfWeek === day)
    return {
      dayOfWeek: day,
      open: !!h,
      openTime: hhmm(h?.openTime ?? fallback?.openTime ?? '11:00'),
      closingTime: hhmm(h?.closingTime ?? fallback?.closingTime ?? '22:00'),
    }
  })
  const withBreak = hours.find((h) => h.breakStartTime && h.breakEndTime)
  return {
    rows,
    breakTime: withBreak
      ? { enabled: true, start: hhmm(withBreak.breakStartTime!), end: hhmm(withBreak.breakEndTime!) }
      : { enabled: false, start: '15:00', end: '17:00' },
  }
}

/**
 * 기능명세「영업시간 관리」
 * GET·PUT /api/owner/stores/{storeId}/business-hours — 목록에 없는 요일은 휴무
 */
export function OwnerHoursPage() {
  const { storeId } = useParams<{ storeId: string }>()
  const id = Number(storeId)
  const { data, isPending, isError, refetch, dataUpdatedAt } = useBusinessHours(id)

  if (isPending || isError) {
    return (
      <Page>
        <TopBar title="영업시간 관리" />
        {isPending ? <LoadingState /> : <ErrorState onRetry={() => refetch()} />}
      </Page>
    )
  }
  // 저장 후 서버 값으로 폼을 다시 채우기 위해 key 로 초기화
  return <HoursForm key={dataUpdatedAt} storeId={id} hours={data} />
}

function HoursForm({ storeId, hours }: { storeId: number; hours: BusinessHour[] }) {
  const initial = toForm(hours)
  const [rows, setRows] = useState<DayRow[]>(initial.rows)
  const [breakTime, setBreakTime] = useState<BreakTime>(initial.breakTime)
  const replace = useReplaceBusinessHours(storeId)

  const update = (day: DayOfWeek, patch: Partial<DayRow>) =>
    setRows((list) => list.map((r) => (r.dayOfWeek === day ? { ...r, ...patch } : r)))

  // 마감이 오픈보다 이르면 다음날 마감(예: 17:00 ~ 02:00)으로 본다. 같으면 영업시간 0 이라 오류
  const isOvernight = (r: DayRow) => r.closingTime < r.openTime
  const sameTime = rows.some((r) => r.open && r.openTime === r.closingTime)
  const badBreak = breakTime.enabled && breakTime.start >= breakTime.end
  const invalid = sameTime || badBreak

  const save = () => {
    const body: BusinessHourRequest[] = rows
      .filter((r) => r.open)
      .map((r) => ({
        dayOfWeek: r.dayOfWeek,
        openTime: r.openTime,
        closingTime: r.closingTime,
        breakStartTime: breakTime.enabled ? breakTime.start : null,
        breakEndTime: breakTime.enabled ? breakTime.end : null,
      }))
    replace.mutate(body, {
      onSuccess: () => toast('영업시간을 저장했어요'),
      onError: (e) => toast(getErrorMessage(e, '저장하지 못했어요')),
    })
  }

  return (
    <Page
      bottom={
        <Button fullWidth disabled={invalid || replace.isPending} onClick={save}>
          {replace.isPending ? '저장 중…' : '저장'}
        </Button>
      }
    >
      <TopBar title="영업시간 관리" />
      <p className={`${styles.hint} t-caption-13 text-tertiary`}>
        마감 시간이 오픈보다 이르면 다음날 새벽 마감으로 저장돼요.
      </p>
      <ul className={styles.list}>
        {rows.map((r) => {
          const label = DAY_OF_WEEK_LABEL[r.dayOfWeek]
          const wrong = r.open && r.openTime === r.closingTime
          return (
            <li key={r.dayOfWeek} className={`${styles.day} ${r.open ? '' : styles.closed}`}>
              <span className={`${styles.label} t-headline-16`}>{label}</span>
              {!r.open ? (
                <span className="t-body-14 text-tertiary">휴무</span>
              ) : (
                <div className={styles.times}>
                  <input
                    type="time"
                    aria-label={`${label}요일 오픈 시간`}
                    value={r.openTime}
                    onChange={(e) => update(r.dayOfWeek, { openTime: e.target.value })}
                    aria-invalid={wrong}
                  />
                  <span className="text-tertiary">~</span>
                  <input
                    type="time"
                    aria-label={`${label}요일 마감 시간`}
                    value={r.closingTime}
                    onChange={(e) => update(r.dayOfWeek, { closingTime: e.target.value })}
                    aria-invalid={wrong}
                  />
                  {isOvernight(r) && <span className={styles.nextDay}>다음날</span>}
                </div>
              )}
              <Toggle checked={r.open} label={`${label}요일 영업`} onChange={(open) => update(r.dayOfWeek, { open })} />
            </li>
          )
        })}
      </ul>
      {invalid && (
        <Section>
          <Banner tone="danger">
            {badBreak
              ? '브레이크타임 종료는 시작보다 늦어야 해요.'
              : '오픈과 마감 시간이 같아요. 24시간 영업이면 00:00 ~ 23:59 로 입력해주세요.'}
          </Banner>
        </Section>
      )}

      <Section
        title="브레이크타임"
        action={
          <Toggle
            checked={breakTime.enabled}
            label="브레이크타임 사용"
            onChange={(enabled) => setBreakTime({ ...breakTime, enabled })}
          />
        }
      >
        {breakTime.enabled ? (
          <div className={styles.times}>
            <input
              type="time"
              aria-label="브레이크타임 시작"
              value={breakTime.start}
              onChange={(e) => setBreakTime({ ...breakTime, start: e.target.value })}
            />
            <span className="text-tertiary">~</span>
            <input
              type="time"
              aria-label="브레이크타임 종료"
              value={breakTime.end}
              onChange={(e) => setBreakTime({ ...breakTime, end: e.target.value })}
            />
            <span className="t-caption-13 text-tertiary">영업일 공통</span>
          </div>
        ) : (
          <p className="t-caption-13 text-tertiary">브레이크타임 없이 영업해요</p>
        )}
      </Section>
    </Page>
  )
}
