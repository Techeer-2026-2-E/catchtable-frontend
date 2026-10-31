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
  breakEnabled: boolean
  breakStartTime: string
  breakEndTime: string
}

const hhmm = (time: string) => time.slice(0, 5)

function toForm(hours: BusinessHour[]): DayRow[] {
  const fallback = hours[0]
  return DAYS_OF_WEEK.map((day) => {
    const h = hours.find((x) => x.dayOfWeek === day)
    return {
      dayOfWeek: day,
      open: !!h,
      openTime: hhmm(h?.openTime ?? fallback?.openTime ?? '11:00'),
      closingTime: hhmm(h?.closingTime ?? fallback?.closingTime ?? '22:00'),
      breakEnabled: !!(h?.breakStartTime && h.breakEndTime),
      breakStartTime: hhmm(h?.breakStartTime ?? '15:00'),
      breakEndTime: hhmm(h?.breakEndTime ?? '17:00'),
    }
  })
}

const minutes = (time: string) => {
  const [hour, minute] = time.split(':').map(Number)
  return hour * 60 + minute
}

function validBreak(row: DayRow) {
  if (!row.breakEnabled) return true
  if (!row.breakStartTime || !row.breakEndTime) return false
  const open = minutes(row.openTime)
  // 여는 시각보다 이른 브레이크 시각은 다음 날로 계산한다.
  const offset = (time: string) => minutes(time) + (minutes(time) < open ? 1440 : 0)
  const close = offset(row.closingTime)
  const start = offset(row.breakStartTime)
  const end = offset(row.breakEndTime)
  return open < start && start < end && end < close
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
  const [rows, setRows] = useState<DayRow[]>(() => toForm(hours))
  const replace = useReplaceBusinessHours(storeId)

  const update = (day: DayOfWeek, patch: Partial<DayRow>) =>
    setRows((list) => list.map((r) => (r.dayOfWeek === day ? { ...r, ...patch } : r)))

  // 마감이 오픈보다 이르면 다음날 마감(예: 17:00 ~ 02:00)으로 본다. 같으면 영업시간 0 이라 오류
  const isOvernight = (r: DayRow) => r.closingTime < r.openTime
  const invalidRow = rows.find((r) => r.open && (!r.openTime || !r.closingTime || r.openTime === r.closingTime || !validBreak(r)))
  const invalid = !!invalidRow

  const save = () => {
    const body: BusinessHourRequest[] = rows
      .filter((r) => r.open)
      .map((r) => ({
        dayOfWeek: r.dayOfWeek,
        openTime: r.openTime,
        closingTime: r.closingTime,
        breakStartTime: r.breakEnabled ? r.breakStartTime : null,
        breakEndTime: r.breakEnabled ? r.breakEndTime : null,
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
                <div className={styles.schedule}>
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
                  <div className={styles.breakHeader}>
                    <span className="t-caption-13 text-secondary">브레이크타임</span>
                    <Toggle checked={r.breakEnabled} label={`${label}요일 브레이크타임 사용`} onChange={(breakEnabled) => update(r.dayOfWeek, { breakEnabled })} />
                  </div>
                  {r.breakEnabled && (
                    <div className={styles.times}>
                      <input type="time" aria-label={`${label}요일 브레이크 시작`} value={r.breakStartTime} onChange={(e) => update(r.dayOfWeek, { breakStartTime: e.target.value })} aria-invalid={!validBreak(r)} />
                      <span className="text-tertiary">~</span>
                      <input type="time" aria-label={`${label}요일 브레이크 종료`} value={r.breakEndTime} onChange={(e) => update(r.dayOfWeek, { breakEndTime: e.target.value })} aria-invalid={!validBreak(r)} />
                    </div>
                  )}
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
            {invalidRow && `${DAY_OF_WEEK_LABEL[invalidRow.dayOfWeek]}요일의 시간을 확인해주세요. 오픈과 마감은 달라야 하며, 브레이크타임은 영업 구간 안에서 시작·종료 순서여야 해요.`}
          </Banner>
        </Section>
      )}

    </Page>
  )
}
