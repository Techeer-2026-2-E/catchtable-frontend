import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CalendarX } from 'lucide-react'
import { useNavigate } from 'react-router'
import {
  getReservationDisplayStatus,
  RESERVATION_STATUS_LABEL,
  RESERVATION_STATUS_TONE,
  WAITING_STATUS_LABEL,
  WAITING_STATUS_TONE,
  type HistoryItem,
  type ReservationStatus,
  type WaitingStatus,
} from '@/entities'
import { reservationKeys, useCancelReservation, useHistory } from '@/features/reservation'
import { useCancelWaiting } from '@/features/waiting'
import { paths } from '@/shared/config'
import { getErrorMessage } from '@/shared/lib'
import { dayjs } from '@/shared/lib/dayjs'
import { Button, Dialog, EmptyState, ErrorState, LoadingState, Page, Tabs, toast, TopBar } from '@/shared/ui'
import styles from './MyDiningPage.module.css'

type Tab = 'active' | 'past'
type CancelTarget = { item: HistoryItem } | null

/** 진행 중은 가까운 순, 지난 내역은 최근 순 — 예약은 방문 시각, 웨이팅은 접수 시각 기준 */
const sortKey = (item: HistoryItem) => item.reservationStartAt ?? item.requestedAt

/**
 * 기능명세「예약·웨이팅 목록 조회」「예약·웨이팅 취소」
 * GET /api/user/reservations?status=ACTIVE|ENDED — 예약과 웨이팅을 함께 반환
 */
export function MyDiningPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('active')
  const history = useHistory({ status: tab === 'active' ? 'ACTIVE' : 'ENDED' })
  const cancelReservation = useCancelReservation()
  const cancelWaiting = useCancelWaiting()
  const [cancelTarget, setCancelTarget] = useState<CancelTarget>(null)

  const items = [...(history.data ?? [])].sort((a, b) =>
    tab === 'active' ? sortKey(a).localeCompare(sortKey(b)) : sortKey(b).localeCompare(sortKey(a)),
  )

  const confirmCancel = () => {
    if (!cancelTarget) return
    const { item } = cancelTarget
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

      {history.isPending ? (
        <LoadingState />
      ) : history.isError ? (
        <ErrorState onRetry={() => history.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<CalendarX />}
          title={tab === 'active' ? '진행 중인 예약·웨이팅이 없어요' : '지난 내역이 없어요'}
          description="마음에 드는 매장을 찾아 예약해보세요"
        />
      ) : (
        <ul className={styles.list}>
          {items.map((item) =>
            item.type === 'RESERVATION' ? (
              <ReservationItem
                key={`r-${item.id}`}
                item={item}
                onOpen={() => navigate(paths.reservationDetail(item.id))}
                onReview={() => navigate(paths.reviewWrite(item.id))}
                onCancel={() => setCancelTarget({ item })}
              />
            ) : (
              <WaitingItem
                key={`w-${item.id}`}
                item={item}
                onOpen={() => navigate(paths.waiting(item.id))}
                onCancel={() => setCancelTarget({ item })}
              />
            ),
          )}
        </ul>
      )}

      <Dialog
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title={cancelTarget?.item.type === 'WAITING' ? '웨이팅을 취소할까요?' : '예약을 취소할까요?'}
        confirmLabel={cancelTarget?.item.type === 'WAITING' ? '웨이팅 취소' : '예약 취소'}
        onConfirm={confirmCancel}
      >
        {cancelTarget?.item.storeName} {cancelTarget?.item.type === 'WAITING' ? '웨이팅' : '예약'}이 취소돼요. 취소 후에는 되돌릴 수 없어요.
      </Dialog>
    </Page>
  )
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
  const startAt = dayjs(item.reservationStartAt ?? item.requestedAt)
  const upcoming = status === 'CONFIRMED' && startAt.isAfter(dayjs())
  return (
    <li className={styles.row}>
      <button type="button" className={styles.lead} onClick={onOpen} aria-label={`${item.storeName} 예약 상세`}>
        <span className="t-caption-12 text-tertiary tnum">{startAt.format('M/D dd')}</span>
        <span className={`${styles.leadValue} tnum`}>{startAt.format('HH:mm')}</span>
      </button>
      <div className={styles.body}>
        <button type="button" className={styles.bodyMain} onClick={onOpen}>
          <span className="status-text" data-tone={RESERVATION_STATUS_TONE[display]}>
            {RESERVATION_STATUS_LABEL[display]}
          </span>
          <span className="t-headline-16">{item.storeName}</span>
          <span className="t-caption-13 text-tertiary">{item.partySize}명</span>
        </button>
        {upcoming && (
          <div className={styles.actions}>
            <Button variant="soft" size="S" onClick={onCancel}>
              예약 취소
            </Button>
          </div>
        )}
        {status === 'COMPLETED' && (
          <div className={styles.actions}>
            <Button variant="outline" size="S" onClick={onReview}>
              리뷰 쓰기
            </Button>
          </div>
        )}
      </div>
    </li>
  )
}

function WaitingItem({ item, onOpen, onCancel }: { item: HistoryItem; onOpen: () => void; onCancel: () => void }) {
  const status = item.status as WaitingStatus
  return (
    <li className={styles.row}>
      <button type="button" className={styles.lead} onClick={onOpen} aria-label={`${item.storeName} 웨이팅 현황`}>
        <span className="t-caption-12 text-tertiary">대기번호</span>
        <span className={`${styles.leadValue} tnum`}>{item.waitNumber}</span>
      </button>
      <div className={styles.body}>
        <button type="button" className={styles.bodyMain} onClick={onOpen}>
          <span className="status-text" data-tone={WAITING_STATUS_TONE[status]}>
            웨이팅 {WAITING_STATUS_LABEL[status]}
          </span>
          <span className="t-headline-16">{item.storeName}</span>
          <span className="t-caption-13 text-tertiary tnum">
            {item.partySize}명, {dayjs(item.requestedAt).format('M/D HH:mm')} 접수
          </span>
        </button>
        {item.active && (
          <div className={styles.actions}>
            <Button variant="secondary" size="S" onClick={onOpen}>
              순번 보기
            </Button>
            <Button variant="soft" size="S" onClick={onCancel}>
              웨이팅 취소
            </Button>
          </div>
        )}
      </div>
    </li>
  )
}
