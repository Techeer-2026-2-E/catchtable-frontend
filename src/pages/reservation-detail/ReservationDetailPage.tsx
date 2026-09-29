import { useState } from 'react'
import { CalendarCheck, MapPin } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { RESERVATION_STATUS_LABEL, RESERVATION_STATUS_TONE, type ReservationStatus } from '@/entities'
import { findMockStore, MOCK_RESERVATIONS } from '@/entities/mock'
import { paths, ROUTES } from '@/shared/config'
import { dayjs } from '@/shared/lib/dayjs'
import { formatTime } from '@/shared/lib/format'
import { Badge, Banner, Button, Dialog, Divider, Page, Section, toast, TopBar } from '@/shared/ui'
import styles from './ReservationDetailPage.module.css'

export function ReservationDetailPage() {
  const { reservationId } = useParams<{ reservationId: string }>()
  const navigate = useNavigate()
  const { state } = useLocation() as {
    state: { justCreated?: boolean; tableNumber?: number; tableTypeLabel?: string } | null
  }
  // TODO(API 연동): useReservationDetail(reservationId), useCancelReservation
  const found = MOCK_RESERVATIONS.find((r) => r.id === Number(reservationId)) ?? MOCK_RESERVATIONS[0]
  // 방금 만든 예약이면 자동 배정된 테이블 정보를 반영
  const reservation = state?.tableNumber
    ? { ...found, tableNumber: state.tableNumber, tableTypeLabel: state.tableTypeLabel ?? found.tableTypeLabel }
    : found
  const store = findMockStore(reservation.storeId)
  const [status, setStatus] = useState<ReservationStatus>(reservation.status)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const cancelable = status === 'CONFIRMED'
  const when = `${dayjs(reservation.date).format('M월 D일 (dd)')} ${formatTime(reservation.time)}`

  return (
    <Page
      bottom={
        cancelable ? (
          <>
            <Button variant="soft" className={styles.flex} onClick={() => setConfirmOpen(true)}>
              예약 취소
            </Button>
            <Button variant="outline" className={styles.flex} onClick={() => navigate(ROUTES.MY_DINING)}>
              내역 보기
            </Button>
          </>
        ) : undefined
      }
    >
      <TopBar
        title={state?.justCreated ? undefined : '예약 상세'}
        leading={state?.justCreated ? 'close' : 'back'}
        onLeadingClick={state?.justCreated ? () => navigate(ROUTES.HOME) : undefined}
      />

      {state?.justCreated && (
        <div className={styles.done}>
          <span className={styles.doneIcon}>
            <CalendarCheck aria-hidden />
          </span>
          <h1 className="t-title-20">예약이 확정됐어요</h1>
          <p className="t-body-14 text-secondary">방문 시간에 맞춰 매장에 도착해주세요</p>
        </div>
      )}

      <Section>
        <div className={styles.head}>
          <Badge tone={RESERVATION_STATUS_TONE[status]}>{RESERVATION_STATUS_LABEL[status]}</Badge>
          <span className="t-caption-13 text-tertiary">예약번호 {reservation.id}</span>
        </div>
        <button type="button" className={styles.store} onClick={() => navigate(paths.storeDetail(store.id))}>
          <span className="t-title-18">{reservation.storeName}</span>
        </button>
        <dl className={styles.info}>
          <dt>일시</dt>
          <dd>{when}</dd>
          <dt>인원</dt>
          <dd>{reservation.partySize}명</dd>
          <dt>좌석</dt>
          <dd>
            {reservation.tableTypeLabel ?? '-'}
            {reservation.tableNumber ? ` · ${reservation.tableNumber}번 테이블 (자동 배정)` : ' · 방문 시 자동 배정'}
          </dd>
        </dl>
      </Section>
      <Divider thick />
      <Section title="매장 위치">
        <p className={styles.address}>
          <MapPin aria-hidden />
          {store.address}
        </p>
      </Section>
      {cancelable && (
        <Section>
          <Banner tone="info">방문 당일 취소나 노쇼는 이후 예약이 제한될 수 있어요.</Banner>
        </Section>
      )}

      <Dialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="예약을 취소할까요?"
        confirmLabel="예약 취소"
        onConfirm={() => {
          setStatus('CANCELED')
          setConfirmOpen(false)
          toast('예약을 취소했어요')
        }}
      >
        {when} · {reservation.partySize}명 예약이 취소돼요. 취소 후에는 되돌릴 수 없어요.
      </Dialog>
    </Page>
  )
}
