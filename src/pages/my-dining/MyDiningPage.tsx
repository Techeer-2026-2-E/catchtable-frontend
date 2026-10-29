import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CalendarX } from 'lucide-react'
import { useNavigate } from 'react-router'
import {
  getReservationDisplayStatus,
  RESERVATION_STATUS_LABEL,
  WAITING_STATUS_LABEL,
  type HistoryItem,
  type HistoryType,
  type ReservationStatus,
  type WaitingStatus,
} from '@/entities'
import { reservationKeys, useCancelReservation, useHistory } from '@/features/reservation'
import { useCancelWaiting } from '@/features/waiting'
import { paths } from '@/shared/config'
import { getErrorMessage } from '@/shared/lib'
import { dayjs } from '@/shared/lib/dayjs'
import { formatTime } from '@/shared/lib/format'
import { Button, Dialog, EmptyState, ErrorState, LoadingState, Page, Tabs, toast, TopBar } from '@/shared/ui'
import styles from './MyDiningPage.module.css'

type Tab = 'ALL' | HistoryType
const TABS: { value: Tab; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'WAITING', label: '웨이팅' },
  { value: 'RESERVATION', label: '예약' },
]

/** 묶는 날짜 — 예약은 방문일, 웨이팅은 줄 선 날 */
const dayOf = (item: HistoryItem) => dayjs(item.reservationStartAt ?? item.waitingDate ?? item.requestedAt).format('YYYY-MM-DD')
/** 같은 날 안에서의 순서 — 예약은 방문 시각, 웨이팅은 접수 시각 */
const timeOf = (item: HistoryItem) => item.reservationStartAt ?? item.requestedAt

/**
 * 기능명세「예약·웨이팅 목록 조회」「예약·웨이팅 취소」
 * GET /api/user/reservations?type=WAITING|RESERVATION — 날짜별로 묶어 최근 날짜부터
 */
export function MyDiningPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('ALL')
  const history = useHistory(tab === 'ALL' ? undefined : { type: tab })
  const cancelReservation = useCancelReservation()
  const cancelWaiting = useCancelWaiting()
  const [cancelTarget, setCancelTarget] = useState<HistoryItem | null>(null)

  const groups = groupByDay(history.data ?? [])

  const confirmCancel = () => {
    if (!cancelTarget) return
    const item = cancelTarget
    const options = {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: reservationKeys.all })
        toast(item.type === 'RESERVATION' ? '예약을 취소했어요' : '웨이팅을 취소했어요')
        setCancelTarget(null)
      },
      onError: (e: unknown) => toast(getErrorMessage(e, '취소하지 못했어요')),
    }
    if (item.type === 'RESERVATION') cancelReservation.mutate(item.id, options)
    else cancelWaiting.mutate(item.id, options)
  }

  return (
    <Page muted>
      <div className={styles.head}>
        <TopBar title="마이다이닝" leading="none" large />
        <Tabs items={TABS} value={tab} onChange={setTab} />
      </div>

      {history.isPending ? (
        <LoadingState />
      ) : history.isError ? (
        <ErrorState onRetry={() => history.refetch()} />
      ) : groups.length === 0 ? (
        <EmptyState icon={<CalendarX />} title="아직 내역이 없어요" description="마음에 드는 매장을 찾아 예약하거나 웨이팅해 보세요" />
      ) : (
        <div className={styles.groups}>
          {groups.map(({ day, items }) => (
            <section key={day} className={styles.group} aria-label={dayjs(day).format('YYYY년 M월 D일')}>
              <h2 className={`${styles.date} tnum`}>{dayjs(day).format('YYYY. M. D')}</h2>
              <ul>
                {items.map((item) => (
                  <li key={`${item.type}-${item.id}`} className={styles.item}>
                    {item.type === 'RESERVATION' ? (
                      <ReservationItem
                        item={item}
                        onOpen={() => navigate(paths.reservationDetail(item.id))}
                        onReview={() => navigate(paths.reviewWrite(item.id))}
                        onCancel={() => setCancelTarget(item)}
                      />
                    ) : (
                      <WaitingItem item={item} onOpen={() => navigate(paths.waiting(item.id))} onCancel={() => setCancelTarget(item)} />
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <Dialog
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title={cancelTarget?.type === 'WAITING' ? '웨이팅을 취소할까요?' : '예약을 취소할까요?'}
        confirmLabel={cancelTarget?.type === 'WAITING' ? '웨이팅 취소' : '예약 취소'}
        onConfirm={confirmCancel}
      >
        {cancelTarget?.storeName} {cancelTarget?.type === 'WAITING' ? '웨이팅' : '예약'}이 취소돼요. 취소 후에는 되돌릴 수 없어요.
      </Dialog>
    </Page>
  )
}

/** 날짜별로 묶기 — 최근 날짜부터, 같은 날은 이른 시각부터 */
function groupByDay(items: HistoryItem[]) {
  const map = new Map<string, HistoryItem[]>()
  ;[...items]
    .sort((a, b) => dayOf(b).localeCompare(dayOf(a)) || timeOf(a).localeCompare(timeOf(b)))
    .forEach((item) => map.set(dayOf(item), [...(map.get(dayOf(item)) ?? []), item]))
  return [...map].map(([day, list]) => ({ day, items: list }))
}

/** 방문일 표시 — 오늘·내일은 말로 */
const relativeDay = (iso: string) => {
  const d = dayjs(iso)
  if (d.isSame(dayjs(), 'day')) return `오늘(${d.format('dd')})`
  if (d.isSame(dayjs().add(1, 'day'), 'day')) return `내일(${d.format('dd')})`
  return d.format('M/D(dd)')
}

function ReservationItem({
  item,
  onOpen,
  onCancel,
  onReview,
}: {
  item: HistoryItem
  onOpen: () => void
  onCancel: () => void
  onReview: () => void
}) {
  const status = item.status as ReservationStatus
  const display = getReservationDisplayStatus({ status })
  const label = RESERVATION_STATUS_LABEL[display]
  const startAt = item.reservationStartAt ?? item.requestedAt
  const upcoming = status === 'CONFIRMED' && dayjs(startAt).isAfter(dayjs())
  return (
    <>
      <p className={styles.statusLine}>
        <strong>{label.startsWith('예약') ? label : `예약 ${label}`}</strong>
        {item.active && (
          <span className="text-brand tnum">
            {relativeDay(startAt)} {formatTime(startAt)} 방문
          </span>
        )}
      </p>
      <button type="button" className={styles.summary} onClick={onOpen}>
        <span className="t-headline-16">{item.storeName}</span>
        <span className="t-body-14 text-secondary tnum">
          {item.active ? `${item.partySize}명` : `${formatTime(startAt)}, ${item.partySize}명`}
        </span>
      </button>
      <div className={styles.actions}>
        <Button variant="outline" size="M" className={styles.main} onClick={onOpen}>
          예약 상세
        </Button>
        {upcoming && (
          <Button variant="soft" size="M" onClick={onCancel}>
            취소
          </Button>
        )}
        {status === 'COMPLETED' && (
          <Button variant="soft" size="M" onClick={onReview}>
            리뷰 쓰기
          </Button>
        )}
      </div>
    </>
  )
}

function WaitingItem({ item, onOpen, onCancel }: { item: HistoryItem; onOpen: () => void; onCancel: () => void }) {
  const status = item.status as WaitingStatus
  return (
    <>
      <p className={styles.statusLine}>
        <strong>웨이팅 {WAITING_STATUS_LABEL[status]}</strong>
        <span className={item.active ? 'text-brand tnum' : 'text-tertiary tnum'}>대기번호 {item.waitNumber}번</span>
      </p>
      <button type="button" className={styles.summary} onClick={onOpen}>
        <span className="t-headline-16">{item.storeName}</span>
        <span className="t-body-14 text-secondary tnum">
          {formatTime(item.requestedAt)} 접수, {item.partySize}명
        </span>
      </button>
      <div className={styles.actions}>
        <Button variant="outline" size="M" className={styles.main} onClick={onOpen}>
          {item.active ? '순번 보기' : '웨이팅 상세'}
        </Button>
        {item.active && (
          <Button variant="soft" size="M" onClick={onCancel}>
            취소
          </Button>
        )}
      </div>
    </>
  )
}
