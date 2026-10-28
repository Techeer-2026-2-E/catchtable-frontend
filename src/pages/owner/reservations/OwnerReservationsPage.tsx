import { useEffect, useState } from 'react'
import { CalendarX, ChevronLeft, ChevronRight } from 'lucide-react'
import { useParams } from 'react-router'
import {
  getReservationDisplayStatus,
  RESERVATION_STATUS_LABEL,
  RESERVATION_STATUS_TONE,
  type OwnerReservation,
  type ReservationDisplayStatus,
} from '@/entities'
import { useOwnerReservationActions, useOwnerReservations } from '@/features/owner-reservation'
import { useReservationPolicy, useStoreTables } from '@/features/owner-store'
import { getErrorMessage } from '@/shared/lib'
import { dayjs } from '@/shared/lib/dayjs'
import { formatPhone, formatTime } from '@/shared/lib/format'
import {
  Badge,
  Button,
  Card,
  Chip,
  ChipGroup,
  Dialog,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState,
  Page,
  Textarea,
  toast,
  TopBar,
} from '@/shared/ui'
import { ChangeReservationSheet } from './ChangeReservationSheet'
import styles from './OwnerReservationsPage.module.css'

type Filter = 'ALL' | ReservationDisplayStatus
const FILTERS: Filter[] = ['ALL', 'CONFIRMED', 'VISITED', 'COMPLETED', 'NO_SHOW', 'CANCELLED']
type Pending = { type: 'cancel' | 'noShow'; reservation: OwnerReservation } | null
const DEFAULT_REASON = { cancel: '매장 사정으로 예약을 취소합니다.', noShow: '예약 시간에 방문하지 않았습니다.' }

/** 1분마다 현재 시각 갱신 — 노쇼 가능 시점 판정용 */
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
 * GET /api/owner/stores/{storeId}/reservations?date= · POST /api/owner/reservations/{id}/{enter|cancel|no-show}
 * 자동 이용 완료는 서버가 처리하고, 목록을 1분마다 다시 받아 반영
 */
export function OwnerReservationsPage() {
  const { storeId } = useParams<{ storeId: string }>()
  const id = Number(storeId)
  const [date, setDate] = useState(() => dayjs().startOf('day'))
  const [filter, setFilter] = useState<Filter>('ALL')
  const [pending, setPending] = useState<Pending>(null)
  const [reason, setReason] = useState('')
  const [changing, setChanging] = useState<OwnerReservation | null>(null)
  const tables = useStoreTables(id).data
  // 응답에는 tableId 만 있어서 테이블 목록(GET /owner/stores/{id}/tables)으로 번호를 찾음
  const tableNumberOf = (tableId: number | null) => tables?.find((t) => t.id === tableId)?.tableNumber

  const { data = [], isPending, isError, refetch } = useOwnerReservations(id, date.format('YYYY-MM-DD'))
  const policy = useReservationPolicy(id).data
  const { enter, cancel, noShow } = useOwnerReservationActions()
  const graceMinutes = policy?.arrivalGraceMinutes ?? 10

  const now = useMinuteClock()
  const isToday = date.isSame(now, 'day')
  const rows = data
    .map((r) => ({ ...r, display: getReservationDisplayStatus(r) }))
    .sort((a, b) => a.reservationStartAt.localeCompare(b.reservationStartAt))
  const list = rows.filter((r) => filter === 'ALL' || r.display === filter)
  const count = (f: Filter) => (f === 'ALL' ? rows.length : rows.filter((r) => r.display === f).length)
  const onError = (e: unknown) => toast(getErrorMessage(e, '처리하지 못했어요'))

  const openDialog = (type: 'cancel' | 'noShow', reservation: OwnerReservation) => {
    setReason(DEFAULT_REASON[type])
    setPending({ type, reservation })
  }

  const confirm = () => {
    if (!pending || !reason.trim()) return
    const { reservation: r, type } = pending
    const vars = { id: r.reservationId, body: { reason: reason.trim() } }
    const onSuccess = (message: string) => () => {
      toast(message)
      setPending(null)
    }
    if (type === 'noShow') noShow.mutate(vars, { onSuccess: onSuccess('노쇼로 처리했어요'), onError })
    else cancel.mutate(vars, { onSuccess: onSuccess('예약을 취소했어요. 고객에게 알림이 전송돼요'), onError })
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

      {isPending ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : list.length === 0 ? (
        <EmptyState icon={<CalendarX />} title="예약이 없어요" />
      ) : (
        <ul className={styles.list}>
          {list.map((r) => {
            const start = dayjs(r.reservationStartAt)
            const noShowAvailableAt = start.add(graceMinutes, 'minute')
            return (
              <Card as="li" key={r.reservationId} className={styles.card}>
                <div className={styles.head}>
                  <p className="t-headline-16">
                    {formatTime(r.reservationStartAt)} · {r.customerName}
                  </p>
                  <Badge tone={RESERVATION_STATUS_TONE[r.display]}>{RESERVATION_STATUS_LABEL[r.display]}</Badge>
                </div>
                <p className="t-caption-13 text-tertiary">
                  {r.partySize}명{tableNumberOf(r.tableId) != null && ` · ${tableNumberOf(r.tableId)}번 테이블`} ·{' '}
                  {formatPhone(r.customerPhone)}
                </p>
                {r.display === 'VISITED' && (
                  <p className="t-caption-13 text-accent">{formatTime(r.reservationEndAt)}에 자동으로 이용 완료 처리돼요</p>
                )}
                {r.display === 'COMPLETED' && r.checkedInAt && (
                  <p className="t-caption-13 text-tertiary">
                    {dayjs(r.checkedInAt).format('HH:mm')} 방문 · 이용 시간이 지나 자동으로 이용 완료됐어요
                  </p>
                )}
                {(r.display === 'CANCELLED' || r.display === 'NO_SHOW') && (r.cancellationReason || r.noShowReason) && (
                  <p className="t-caption-13 text-tertiary">
                    {r.display === 'CANCELLED' ? (r.cancellationActor === 'OWNER' ? '매장 취소' : '고객 취소') : '노쇼'} ·{' '}
                    {r.cancellationReason ?? r.noShowReason}
                  </p>
                )}
                {r.display === 'CONFIRMED' && (
                  <div className={styles.actions}>
                    <Button
                      size="S"
                      variant="secondary"
                      disabled={enter.isPending}
                      onClick={() =>
                        enter.mutate(r.reservationId, {
                          onSuccess: () => toast(`${r.customerName}님 방문을 확인했어요`),
                          onError,
                        })
                      }
                    >
                      방문 확인
                    </Button>
                    <Button
                      size="S"
                      variant="ghost"
                      disabled={now.isBefore(noShowAvailableAt)}
                      title={`예약 시각 ${graceMinutes}분 후부터 노쇼 처리할 수 있어요`}
                      onClick={() => openDialog('noShow', r)}
                    >
                      노쇼 처리
                    </Button>
                    <Button size="S" variant="ghost" onClick={() => setChanging(r)}>
                      변경
                    </Button>
                    <Button size="S" variant="ghost" onClick={() => openDialog('cancel', r)}>
                      취소
                    </Button>
                  </div>
                )}
                {r.display === 'CONFIRMED' && now.isBefore(noShowAvailableAt) && isToday && (
                  <p className="t-caption-12 text-tertiary">노쇼 처리는 {noShowAvailableAt.format('HH:mm')}부터 가능해요</p>
                )}
              </Card>
            )
          })}
        </ul>
      )}

      {changing && <ChangeReservationSheet key={changing.reservationId} reservation={changing} onClose={() => setChanging(null)} />}

      <Dialog
        isOpen={!!pending}
        onClose={() => setPending(null)}
        title={pending?.type === 'noShow' ? '노쇼로 처리할까요?' : '예약을 취소할까요?'}
        confirmLabel={cancel.isPending || noShow.isPending ? '처리 중…' : pending?.type === 'noShow' ? '노쇼 처리' : '예약 취소'}
        onConfirm={confirm}
      >
        {pending &&
          `${formatTime(pending.reservation.reservationStartAt)} ${pending.reservation.customerName}님 · ${pending.reservation.partySize}명`}
        <br />
        {pending?.type === 'noShow'
          ? '노쇼 처리하면 테이블이 다시 예약 가능 상태가 돼요.'
          : '취소 사실과 사유가 고객에게 알림으로 전송돼요.'}
        <Textarea
          label={pending?.type === 'noShow' ? '노쇼 사유' : '취소 사유'}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          rows={2}
        />
      </Dialog>
    </Page>
  )
}
