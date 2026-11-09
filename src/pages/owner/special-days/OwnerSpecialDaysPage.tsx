import { useState } from 'react'
import { CalendarDays, ChevronRight } from 'lucide-react'
import { useParams } from 'react-router'
import type { SpecialBusinessDay } from '@/entities'
import { useSpecialDayMutations, useSpecialDays, type SpecialBusinessDayRequest } from '@/features/owner-store'
import { getErrorCode, getErrorMessage } from '@/shared/lib'
import { dayjs } from '@/shared/lib/dayjs'
import { Badge, BottomSheet, Button, EmptyState, ErrorState, LoadingState, Page, TextField, toast, Toggle, TopBar } from '@/shared/ui'
import styles from './OwnerSpecialDaysPage.module.css'

const hhmm = (time: string | null) => time?.slice(0, 5) ?? ''

/** "12:00 ~ 20:00, 브레이크 15:00 ~ 17:00" */
const describe = (d: SpecialBusinessDay) =>
  d.closed
    ? '하루 쉬어요'
    : `${hhmm(d.openTime)} ~ ${hhmm(d.closingTime)}, ${
        d.breakStartTime ? `브레이크 ${hhmm(d.breakStartTime)} ~ ${hhmm(d.breakEndTime)}` : '브레이크 없음'
      }`

const CONFLICT_MESSAGE: Record<string, string> = {
  BUSINESS_HOUR_HAS_RESERVATIONS: '이 날 이미 받은 예약과 겹쳐서 바꿀 수 없어요',
  BUSINESS_HOUR_HAS_WAITINGS: '이 날 진행 중인 웨이팅과 겹쳐서 바꿀 수 없어요',
  PAST_BUSINESS_DATE: '지난 날짜는 바꿀 수 없어요',
}
const errorText = (e: unknown, fallback: string) => CONFLICT_MESSAGE[getErrorCode(e) ?? ''] ?? getErrorMessage(e, fallback)

/**
 * 기능명세「특정일 휴무, 영업시간 변경」
 * GET /api/owner/stores/{storeId}/special-business-days · PUT·DELETE …/{yyyy-MM-dd}
 */
export function OwnerSpecialDaysPage() {
  const { storeId } = useParams<{ storeId: string }>()
  const id = Number(storeId)
  const { data, isPending, isError, refetch } = useSpecialDays(id)
  // null = 닫힘, 'new' = 추가, 그 외 = 수정할 날
  const [editing, setEditing] = useState<SpecialBusinessDay | 'new' | null>(null)
  const today = dayjs().format('YYYY-MM-DD')
  const days = [...(data ?? [])].filter((d) => d.businessDate >= today).sort((a, b) => a.businessDate.localeCompare(b.businessDate))

  return (
    <Page
      bottom={
        <Button fullWidth onClick={() => setEditing('new')}>
          날짜 추가
        </Button>
      }
    >
      <TopBar title="특정일 휴무, 영업 변경" />
      <p className={`${styles.hint} t-caption-13 text-secondary`}>
        요일별 영업시간과 다르게 여는 날이나 쉬는 날을 날짜별로 정해요. 지난 날짜는 바꿀 수 없어요.
      </p>
      {isPending ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : days.length === 0 ? (
        <EmptyState icon={<CalendarDays />} title="정해 둔 날이 없어요" description="쉬는 날이나 시간을 바꿀 날을 추가해보세요" />
      ) : (
        <ul className={styles.list}>
          {days.map((d) => (
            <li key={d.businessDate}>
              <button type="button" className={styles.card} onClick={() => setEditing(d)}>
                <span className={styles.text}>
                  <span className={styles.title}>
                    <span className="t-headline-16 tnum">{dayjs(d.businessDate).format('M월 D일 (dd)')}</span>
                    <Badge tone={d.closed ? 'danger' : 'neutral'}>{d.closed ? '휴무' : '시간 변경'}</Badge>
                  </span>
                  <span className="t-caption-13 text-secondary tnum">{describe(d)}</span>
                </span>
                <ChevronRight className={styles.chevron} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <SpecialDaySheet
          key={editing === 'new' ? 'new' : editing.businessDate}
          storeId={id}
          initial={editing === 'new' ? null : editing}
          taken={days.map((d) => d.businessDate)}
          onClose={() => setEditing(null)}
        />
      )}
    </Page>
  )
}

function SpecialDaySheet({
  storeId,
  initial,
  taken,
  onClose,
}: {
  storeId: number
  initial: SpecialBusinessDay | null
  taken: string[]
  onClose: () => void
}) {
  const { put, remove } = useSpecialDayMutations(storeId)
  const today = dayjs().format('YYYY-MM-DD')
  const [date, setDate] = useState(initial?.businessDate ?? dayjs().add(1, 'day').format('YYYY-MM-DD'))
  const [closed, setClosed] = useState(initial?.closed ?? false)
  const [openTime, setOpenTime] = useState(hhmm(initial?.openTime ?? null) || '12:00')
  const [closingTime, setClosingTime] = useState(hhmm(initial?.closingTime ?? null) || '20:00')
  const [breakOn, setBreakOn] = useState(!!initial?.breakStartTime)
  const [breakStart, setBreakStart] = useState(hhmm(initial?.breakStartTime ?? null) || '15:00')
  const [breakEnd, setBreakEnd] = useState(hhmm(initial?.breakEndTime ?? null) || '17:00')

  const duplicate = !initial && taken.includes(date)
  const dateError = !date ? '날짜를 골라주세요' : date < today ? '지난 날짜는 고를 수 없어요' : duplicate ? '이미 정해 둔 날이에요. 목록에서 눌러 수정해주세요' : undefined
  const timeError = !closed && (openTime === closingTime || (breakOn && !(breakStart < breakEnd)))
  const busy = put.isPending || remove.isPending

  const save = () => {
    const body: SpecialBusinessDayRequest = closed
      ? { closed: true, openTime: null, closingTime: null, breakStartTime: null, breakEndTime: null }
      : {
          closed: false,
          openTime,
          closingTime,
          breakStartTime: breakOn ? breakStart : null,
          breakEndTime: breakOn ? breakEnd : null,
        }
    put.mutate(
      { date, body },
      {
        onSuccess: () => {
          toast(`${dayjs(date).format('M월 D일')}을 저장했어요`)
          onClose()
        },
        onError: (e) => toast(errorText(e, '저장하지 못했어요')),
      },
    )
  }

  const del = () =>
    remove.mutate(date, {
      onSuccess: () => {
        toast('요일별 영업시간으로 되돌렸어요')
        onClose()
      },
      onError: (e) => toast(errorText(e, '삭제하지 못했어요')),
    })

  return (
    <BottomSheet
      isOpen
      onClose={onClose}
      title={initial ? '특정일 수정' : '특정일 추가'}
      footer={
        <div className={styles.footer}>
          {initial && (
            <Button variant="secondary" disabled={busy} onClick={del}>
              삭제
            </Button>
          )}
          <Button fullWidth disabled={!!dateError || timeError || busy} onClick={save}>
            {put.isPending ? '저장 중…' : '저장'}
          </Button>
        </div>
      }
    >
      <div className={styles.sheet}>
        <TextField
          label="날짜"
          type="date"
          min={today}
          value={date}
          disabled={!!initial}
          onChange={(e) => setDate(e.target.value)}
          error={dateError}
        />
        <div className={styles.toggleRow}>
          <span className={styles.toggleText}>
            <span className="t-headline-16">이날은 쉬어요</span>
            <span className="t-caption-12 text-tertiary">켜면 시간을 입력하지 않아요</span>
          </span>
          <Toggle checked={closed} label="이날은 쉬어요" onChange={setClosed} />
        </div>
        {!closed && (
          <>
            <div className={styles.pair}>
              <TextField label="여는 시간" type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} />
              <TextField label="닫는 시간" type="time" value={closingTime} onChange={(e) => setClosingTime(e.target.value)} />
            </div>
            <div className={styles.toggleRow}>
              <span className="t-headline-16">브레이크타임</span>
              <Toggle checked={breakOn} label="브레이크타임" onChange={setBreakOn} />
            </div>
            {breakOn && (
              <div className={styles.pair}>
                <TextField label="시작" type="time" value={breakStart} onChange={(e) => setBreakStart(e.target.value)} />
                <TextField label="끝" type="time" value={breakEnd} onChange={(e) => setBreakEnd(e.target.value)} />
              </div>
            )}
            {timeError && <p className="t-caption-12 text-danger">시간을 확인해주세요. 여는 시간과 닫는 시간은 달라야 해요.</p>}
          </>
        )}
        <p className="t-caption-12 text-tertiary">이미 받은 예약이나 웨이팅과 겹치는 시간으로는 바꿀 수 없어요</p>
      </div>
    </BottomSheet>
  )
}
