import { useEffect, useState } from 'react'
import { CalendarX, ChevronLeft, ChevronRight } from 'lucide-react'
import { RESERVATION_STATUS_LABEL, RESERVATION_STATUS_TONE, type Reservation, type ReservationStatus } from '@/entities'
import { MOCK_OWNER_RESERVATIONS } from '@/entities/mock'
import { dayjs } from '@/shared/lib/dayjs'
import { Badge, Button, Card, Chip, ChipGroup, Dialog, EmptyState, IconButton, Page, toast, TopBar } from '@/shared/ui'
import styles from './OwnerReservationsPage.module.css'

type Filter = 'ALL' | ReservationStatus
const FILTERS: Filter[] = ['ALL', 'CONFIRMED', 'VISITED', 'COMPLETED', 'NO_SHOW', 'CANCELED']
/** 1회 이용 시간(분) — 예약 정책 값, 지나면 자동 이용 완료 */
const DURATION_MINUTES = 120
/** 도착 유예 시간(분) — 예약 정책 값, 지나야 노쇼 처리 가능 */
const GRACE_MINUTES = 10
type Pending = { type: 'cancel' | 'noShow'; reservation: Reservation } | null

/** 1분마다 현재 시각 갱신 — 자동 이용 완료·노쇼 가능 시점 판정용 */
function useMinuteClock() {
  const [now, setNow] = useState(() => dayjs())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(dayjs()), 60_000)
    return () => window.clearInterval(timer)
  }, [])
  return now
}

/**
 * 기능명세「예약 현황 조회·처리」「예약 확정 상태 조회」「점주 예약 취소」
 * 「예약 방문 확인」「예약 자동 이용 완료」「예약 노쇼 처리」
 */
export function OwnerReservationsPage() {
  const [date, setDate] = useState(() => dayjs().startOf('day'))
  const [filter, setFilter] = useState<Filter>('ALL')
  // TODO(API 연동): useOwnerReservations(storeId, date), useOwnerReservationActions
  const [reservations, setReservations] = useState(MOCK_OWNER_RESERVATIONS)
  const [pending, setPending] = useState<Pending>(null)

  const now = useMinuteClock()
  const isToday = date.isSame(now, 'day')
  /*
   * 기능명세「예약 자동 이용 완료」: 방문 중인 예약은 1회 이용 시간이 지나면 이용 완료로 본다
   * TODO(API 연동): 서버 스케줄러가 상태를 바꾸므로 연동 후에는 서버 값을 그대로 사용
   */
  const withAuto = reservations.map((r) => {
    const end = dayjs(`${r.date}T${r.time}`).add(DURATION_MINUTES, 'minute')
    return r.status === 'VISITED' && !now.isBefore(end) ? { ...r, status: 'COMPLETED' as const, auto: true } : { ...r, auto: false }
  })
  const ofDay = withAuto.filter((r) => dayjs(r.date).isSame(date, 'day'))
  const list = ofDay
    .filter((r) => filter === 'ALL' || r.status === filter)
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
  const count = (f: Filter) => (f === 'ALL' ? ofDay.length : ofDay.filter((r) => r.status === f).length)

  const setStatus = (id: number, status: ReservationStatus, message: string) => {
    setReservations((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)))
    toast(message)
  }

  return (
    <Page>
      <TopBar title="예약 현황 관리" />
      <div className={styles.dateNav}>
        <IconButton label="이전 날" icon={<ChevronLeft />} onClick={() => setDate(date.subtract(1, 'day'))} />
        <button type="button" className="t-headline-16" onClick={() => setDate(dayjs().startOf('day'))}>
          {isToday && '오늘 '}
          {date.format('M월 D일 (dd)')}
        </button>
        <IconButton label="다음 날" icon={<ChevronRight />} onClick={() => setDate(date.add(1, 'day'))} />
      </div>

      <div className={styles.filters}>
        <ChipGroup scroll label="상태 필터">
          {FILTERS.map((f) => (
            <Chip key={f} size="S" selected={filter === f} onClick={() => setFilter(f)}>
              {f === 'ALL' ? '전체' : RESERVATION_STATUS_LABEL[f]} {count(f)}
            </Chip>
          ))}
        </ChipGroup>
      </div>

      {list.length === 0 ? (
        <EmptyState icon={<CalendarX />} title="예약이 없어요" />
      ) : (
        <ul className={styles.list}>
          {list.map((r) => {
            const start = dayjs(`${r.date}T${r.time}`)
            return (
              <Card as="li" key={r.id} className={styles.card}>
                <div className={styles.head}>
                  <p className="t-headline-16">
                    {r.time} · {r.customerName}
                  </p>
                  <Badge tone={RESERVATION_STATUS_TONE[r.status]}>{RESERVATION_STATUS_LABEL[r.status]}</Badge>
                </div>
                <p className="t-caption-13 text-tertiary">
                  {r.partySize}명 · {r.tableTypeLabel ?? '-'}
                  {r.tableNumber ? ` · ${r.tableNumber}번 테이블` : ''}
                </p>
                {r.auto && <p className="t-caption-13 text-tertiary">이용 시간이 지나 자동으로 이용 완료됐어요</p>}
                {r.status === 'VISITED' && (
                  <p className="t-caption-13 text-accent">
                    {start.add(DURATION_MINUTES, 'minute').format('HH:mm')}에 자동으로 이용 완료 처리돼요
                  </p>
                )}
                {r.status === 'CONFIRMED' && (
                  <div className={styles.actions}>
                    <Button size="S" variant="secondary" onClick={() => setStatus(r.id, 'VISITED', `${r.customerName}님 방문을 확인했어요`)}>
                      방문 확인
                    </Button>
                    <Button
                      size="S"
                      variant="ghost"
                      disabled={now.isBefore(start.add(GRACE_MINUTES, 'minute'))}
                      title={`예약 시각 ${GRACE_MINUTES}분 후부터 노쇼 처리할 수 있어요`}
                      onClick={() => setPending({ type: 'noShow', reservation: r })}
                    >
                      노쇼 처리
                    </Button>
                    <Button size="S" variant="ghost" onClick={() => setPending({ type: 'cancel', reservation: r })}>
                      예약 취소
                    </Button>
                  </div>
                )}
                {r.status === 'VISITED' && (
                  <div className={styles.actions}>
                    <Button size="S" variant="secondary" onClick={() => setStatus(r.id, 'COMPLETED', '이용 완료로 처리했어요')}>
                      이용 완료
                    </Button>
                  </div>
                )}
              </Card>
            )
          })}
        </ul>
      )}

      <Dialog
        isOpen={!!pending}
        onClose={() => setPending(null)}
        title={pending?.type === 'noShow' ? '노쇼로 처리할까요?' : '예약을 취소할까요?'}
        confirmLabel={pending?.type === 'noShow' ? '노쇼 처리' : '예약 취소'}
        onConfirm={() => {
          if (!pending) return
          const { reservation: r, type } = pending
          if (type === 'noShow') setStatus(r.id, 'NO_SHOW', '노쇼로 처리했어요')
          else setStatus(r.id, 'CANCELED', '예약을 취소했어요. 고객에게 알림이 전송돼요')
          setPending(null)
        }}
      >
        {pending && `${pending.reservation.time} ${pending.reservation.customerName}님 · ${pending.reservation.partySize}명`}
        <br />
        {pending?.type === 'noShow' ? '노쇼 처리하면 테이블이 다시 예약 가능 상태가 돼요.' : '취소 사실이 고객에게 알림으로 전송돼요.'}
      </Dialog>
    </Page>
  )
}
