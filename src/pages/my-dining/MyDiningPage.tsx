import { useState } from 'react'
import { CalendarX } from 'lucide-react'
import { useNavigate } from 'react-router'
import {
  ACTIVE_WAITING_STATUSES,
  getReservationDisplayStatus,
  RESERVATION_STATUS_LABEL,
  RESERVATION_STATUS_TONE,
  WAITING_STATUS_LABEL,
  WAITING_STATUS_TONE,
  type Reservation,
  type Waiting,
} from '@/entities'
import { useCancelReservation, useReservations } from '@/features/reservation'
import { useCancelWaiting, useWaitings } from '@/features/waiting'
import { paths } from '@/shared/config'
import { getErrorMessage } from '@/shared/lib'
import { dayjs } from '@/shared/lib/dayjs'
import { formatTime } from '@/shared/lib/format'
import { Badge, Button, Card, Dialog, EmptyState, ErrorState, LoadingState, Page, Tabs, toast, TopBar } from '@/shared/ui'
import styles from './MyDiningPage.module.css'

type Tab = 'active' | 'past'
type Item = { kind: 'reservation'; data: Reservation; at: string } | { kind: 'waiting'; data: Waiting; at: string }
type CancelTarget = { kind: Item['kind']; id: number; label: string } | null

const isActiveReservation = (r: Reservation) => r.status === 'CONFIRMED'
const isActiveWaiting = (w: Waiting) => ACTIVE_WAITING_STATUSES.includes(w.status)

/**
 * 기능명세「예약·웨이팅 목록 조회」「예약·웨이팅 취소」
 * GET /api/user/reservations · GET /api/user/waitings
 */
export function MyDiningPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('active')
  const reservations = useReservations()
  const waitings = useWaitings()
  const cancelReservation = useCancelReservation()
  const cancelWaiting = useCancelWaiting()
  const [cancelTarget, setCancelTarget] = useState<CancelTarget>(null)

  const loading = reservations.isPending || waitings.isPending
  const failed = reservations.isError || waitings.isError

  const items: Item[] = [
    ...(waitings.data ?? []).map((w) => ({ kind: 'waiting' as const, data: w, at: w.createdAt ?? '' })),
    ...(reservations.data ?? []).map((r) => ({ kind: 'reservation' as const, data: r, at: r.reservationStartAt })),
  ]
    .filter((item) => {
      const active = item.kind === 'reservation' ? isActiveReservation(item.data) : isActiveWaiting(item.data)
      return tab === 'active' ? active : !active
    })
    // 진행 중은 가까운 순, 지난 내역은 최근 순
    .sort((a, b) => (tab === 'active' ? a.at.localeCompare(b.at) : b.at.localeCompare(a.at)))

  const confirmCancel = () => {
    if (!cancelTarget) return
    const options = {
      onSuccess: () => {
        toast(cancelTarget.kind === 'reservation' ? '예약을 취소했어요' : '웨이팅을 취소했어요')
        setCancelTarget(null)
      },
      onError: (e: unknown) => toast(getErrorMessage(e, '취소하지 못했어요')),
    }
    if (cancelTarget.kind === 'reservation') cancelReservation.mutate(cancelTarget.id, options)
    else cancelWaiting.mutate(cancelTarget.id, options)
  }

  return (
    <Page>
      <TopBar title="마이다이닝" leading="none" large />
      <Tabs
        items={[
          { value: 'active', label: '진행 중' },
          { value: 'past', label: '지난 내역' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {loading ? (
        <LoadingState />
      ) : failed ? (
        <ErrorState
          onRetry={() => {
            reservations.refetch()
            waitings.refetch()
          }}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<CalendarX />}
          title={tab === 'active' ? '진행 중인 예약·웨이팅이 없어요' : '지난 내역이 없어요'}
          description="마음에 드는 매장을 찾아 예약해보세요"
        />
      ) : (
        <ul className={styles.list}>
          {items.map((item) =>
            item.kind === 'reservation' ? (
              <ReservationItem
                key={`r-${item.data.reservationId}`}
                reservation={item.data}
                onOpen={() => navigate(paths.reservationDetail(item.data.reservationId))}
                onCancel={() =>
                  setCancelTarget({ kind: 'reservation', id: item.data.reservationId, label: item.data.storeName })
                }
              />
            ) : (
              <WaitingItem
                key={`w-${item.data.waitingId}`}
                waiting={item.data}
                onOpen={() => navigate(paths.waiting(item.data.waitingId))}
                onCancel={() =>
                  setCancelTarget({ kind: 'waiting', id: item.data.waitingId, label: item.data.storeName ?? '' })
                }
              />
            ),
          )}
        </ul>
      )}

      <Dialog
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title={cancelTarget?.kind === 'waiting' ? '웨이팅을 취소할까요?' : '예약을 취소할까요?'}
        confirmLabel={cancelTarget?.kind === 'waiting' ? '웨이팅 취소' : '예약 취소'}
        onConfirm={confirmCancel}
      >
        {cancelTarget?.label} {cancelTarget?.kind === 'waiting' ? '웨이팅' : '예약'}이 취소돼요. 취소 후에는 되돌릴 수
        없어요.
      </Dialog>
    </Page>
  )
}

function ReservationItem({
  reservation: r,
  onOpen,
  onCancel,
}: {
  reservation: Reservation
  onOpen: () => void
  onCancel: () => void
}) {
  const display = getReservationDisplayStatus(r)
  const upcoming = display === 'CONFIRMED' && dayjs(r.reservationStartAt).isAfter(dayjs())
  return (
    <Card as="li" className={styles.card}>
      <button type="button" className={styles.cardBody} onClick={onOpen}>
        <div className={styles.cardHead}>
          <Badge tone={RESERVATION_STATUS_TONE[display]}>{RESERVATION_STATUS_LABEL[display]}</Badge>
          <span className="t-caption-12 text-tertiary">예약</span>
        </div>
        <p className="t-headline-16">{r.storeName}</p>
        <p className="t-caption-13 text-tertiary">
          {dayjs(r.reservationStartAt).format('M/D(dd)')} {formatTime(r.reservationStartAt)} · {r.partySize}명
          {r.tableTypeLabel && ` · ${r.tableTypeLabel}`}
        </p>
      </button>
      {upcoming && (
        <div className={styles.actions}>
          <Button variant="soft" size="S" onClick={onCancel}>
            예약 취소
          </Button>
        </div>
      )}
      {r.status === 'COMPLETED' && !r.reviewed && (
        <div className={styles.actions}>
          {/* P2: 방문 완료 매장 리뷰 작성 */}
          <Button variant="soft" size="S" onClick={() => toast('리뷰 작성은 준비 중이에요')}>
            리뷰 쓰기
          </Button>
        </div>
      )}
    </Card>
  )
}

function WaitingItem({ waiting: w, onOpen, onCancel }: { waiting: Waiting; onOpen: () => void; onCancel: () => void }) {
  const active = isActiveWaiting(w)
  return (
    <Card as="li" className={styles.card}>
      <button type="button" className={styles.cardBody} onClick={onOpen}>
        <div className={styles.cardHead}>
          <Badge tone={WAITING_STATUS_TONE[w.status]} solid={w.status === 'CALLED'}>
            {w.status === 'WAITING' ? `대기 ${w.teamsAhead + 1}번째` : WAITING_STATUS_LABEL[w.status]}
          </Badge>
          <span className="t-caption-12 text-tertiary">웨이팅</span>
        </div>
        <p className="t-headline-16">{w.storeName}</p>
        <p className="t-caption-13 text-tertiary">
          대기번호 {w.waitNumber}번{w.createdAt && ` · ${dayjs(w.createdAt).format('M/D HH:mm')} 접수`} · {w.partyCount}명
        </p>
      </button>
      {active && (
        <div className={styles.actions}>
          <Button variant="soft" size="S" onClick={onCancel}>
            웨이팅 취소
          </Button>
          <Button variant="outline" size="S" onClick={onOpen}>
            현황 보기
          </Button>
        </div>
      )}
    </Card>
  )
}
