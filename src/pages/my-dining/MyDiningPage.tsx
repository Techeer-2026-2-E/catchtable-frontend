import { useState } from 'react'
import { CalendarX } from 'lucide-react'
import { useNavigate } from 'react-router'
import {
  RESERVATION_STATUS_LABEL,
  RESERVATION_STATUS_TONE,
  WAITING_STATUS_LABEL,
  WAITING_STATUS_TONE,
  type Reservation,
  type Waiting,
} from '@/entities'
import { MOCK_RESERVATIONS, MOCK_WAITINGS } from '@/entities/mock'
import { paths } from '@/shared/config'
import { dayjs } from '@/shared/lib/dayjs'
import { formatTime } from '@/shared/lib/format'
import { Badge, Button, Card, Dialog, EmptyState, Page, Tabs, toast, TopBar } from '@/shared/ui'
import styles from './MyDiningPage.module.css'

type Tab = 'active' | 'past'
type Item = { kind: 'reservation'; data: Reservation } | { kind: 'waiting'; data: Waiting }
type CancelTarget = { kind: Item['kind']; id: number; label: string } | null

const ACTIVE_RESERVATION = ['CONFIRMED', 'VISITED']
const ACTIVE_WAITING = ['WAITING', 'CALLED']

/** 기능명세「예약·웨이팅 목록 조회」「예약·웨이팅 취소」 */
export function MyDiningPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('active')
  // TODO(API 연동): useReservations(), 웨이팅 목록 조회, useCancelReservation, useWaitingActions().cancel
  const [reservations, setReservations] = useState(MOCK_RESERVATIONS)
  const [waitings, setWaitings] = useState(MOCK_WAITINGS)
  const [cancelTarget, setCancelTarget] = useState<CancelTarget>(null)

  const items: Item[] = [
    ...waitings.map((w) => ({ kind: 'waiting' as const, data: w })),
    ...reservations.map((r) => ({ kind: 'reservation' as const, data: r })),
  ].filter((item) => {
    const active =
      item.kind === 'reservation'
        ? ACTIVE_RESERVATION.includes(item.data.status)
        : ACTIVE_WAITING.includes(item.data.status)
    return tab === 'active' ? active : !active
  })

  const confirmCancel = () => {
    if (!cancelTarget) return
    if (cancelTarget.kind === 'reservation') {
      setReservations((list) => list.map((r) => (r.id === cancelTarget.id ? { ...r, status: 'CANCELED' } : r)))
    } else {
      setWaitings((list) => list.map((w) => (w.id === cancelTarget.id ? { ...w, status: 'CANCELED' } : w)))
    }
    toast(cancelTarget.kind === 'reservation' ? '예약을 취소했어요' : '웨이팅을 취소했어요')
    setCancelTarget(null)
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

      {items.length === 0 ? (
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
                key={`r-${item.data.id}`}
                reservation={item.data}
                onOpen={() => navigate(paths.reservationDetail(item.data.id))}
                onCancel={() =>
                  setCancelTarget({ kind: 'reservation', id: item.data.id, label: item.data.storeName })
                }
              />
            ) : (
              <WaitingItem
                key={`w-${item.data.id}`}
                waiting={item.data}
                onOpen={() => navigate(paths.waiting(item.data.id))}
                onCancel={() => setCancelTarget({ kind: 'waiting', id: item.data.id, label: item.data.storeName })}
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
  return (
    <Card as="li" className={styles.card}>
      <button type="button" className={styles.cardBody} onClick={onOpen}>
        <div className={styles.cardHead}>
          <Badge tone={RESERVATION_STATUS_TONE[r.status]}>{RESERVATION_STATUS_LABEL[r.status]}</Badge>
          <span className="t-caption-12 text-tertiary">예약</span>
        </div>
        <p className="t-headline-16">{r.storeName}</p>
        <p className="t-caption-13 text-tertiary">
          {dayjs(r.date).format('M/D(dd)')} {formatTime(r.time)} · {r.partySize}명
          {r.tableTypeLabel && ` · ${r.tableTypeLabel}`}
        </p>
      </button>
      {r.status === 'CONFIRMED' && (
        <div className={styles.actions}>
          <Button variant="soft" size="S" onClick={onCancel}>
            예약 취소
          </Button>
        </div>
      )}
      {r.status === 'COMPLETED' && (
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
  const active = ACTIVE_WAITING.includes(w.status)
  return (
    <Card as="li" className={styles.card}>
      <button type="button" className={styles.cardBody} onClick={onOpen}>
        <div className={styles.cardHead}>
          <Badge tone={WAITING_STATUS_TONE[w.status]} solid={w.status === 'CALLED'}>
            {w.status === 'WAITING' && w.teamsAhead != null ? `대기 ${w.teamsAhead + 1}번째` : WAITING_STATUS_LABEL[w.status]}
          </Badge>
          <span className="t-caption-12 text-tertiary">웨이팅</span>
        </div>
        <p className="t-headline-16">{w.storeName}</p>
        <p className="t-caption-13 text-tertiary">
          대기번호 {w.waitingNumber}번 · {dayjs(w.createdAt).format('HH:mm')} 접수 · {w.partySize}명
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
