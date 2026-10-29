import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { getReservationDisplayStatus, RESERVATION_STATUS_LABEL } from '@/entities'
import { useCancelReservation, useReservationDetail } from '@/features/reservation'
import { useStoreDetail } from '@/features/store-detail'
import { paths, ROUTES } from '@/shared/config'
import { getErrorMessage } from '@/shared/lib'
import { dayjs } from '@/shared/lib/dayjs'
import { formatTime } from '@/shared/lib/format'
import { Button, Dialog, ErrorState, LoadingState, Page, Ticket, toast, TopBar } from '@/shared/ui'
import styles from './ReservationDetailPage.module.css'

/** 예약 상세 — GET /api/user/reservations/{id}, 취소 POST /{id}/cancel */
export function ReservationDetailPage() {
  const { reservationId } = useParams<{ reservationId: string }>()
  const navigate = useNavigate()
  const { state } = useLocation() as { state: { justCreated?: boolean } | null }
  const { data: reservation, isPending, isError, refetch } = useReservationDetail(Number(reservationId))
  const store = useStoreDetail(reservation?.storeId ?? NaN)
  const cancel = useCancelReservation()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const justCreated = !!state?.justCreated

  if (isPending || isError) {
    return (
      <Page>
        <TopBar title="예약 상세" />
        {isPending ? <LoadingState /> : <ErrorState message="예약을 찾을 수 없어요" onRetry={() => refetch()} />}
      </Page>
    )
  }

  const display = getReservationDisplayStatus(reservation)
  const cancelable = display === 'CONFIRMED' && dayjs(reservation.reservationStartAt).isAfter(dayjs())
  const start = dayjs(reservation.reservationStartAt)
  const when = `${start.format('M월 D일 (dd)')} ${formatTime(reservation.reservationStartAt)}`

  const doCancel = () =>
    cancel.mutate(reservation.reservationId, {
      onSuccess: () => {
        setConfirmOpen(false)
        toast('예약을 취소했어요')
      },
      onError: (e) => toast(getErrorMessage(e, '취소하지 못했어요')),
    })

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
        title={justCreated ? undefined : '예약 상세'}
        leading={justCreated ? 'close' : 'back'}
        onLeadingClick={justCreated ? () => navigate(ROUTES.HOME) : undefined}
      />

      <div className={styles.wrap}>
        {justCreated && (
          <h1 className="t-title-24" aria-live="polite">
            예약이 확정됐어요
          </h1>
        )}
        <Ticket
          muted={display !== 'CONFIRMED' && display !== 'VISITED'}
          stub={
            <dl className={styles.info}>
              <dt>인원</dt>
              <dd>{reservation.partySize}명</dd>
              <dt>주소</dt>
              <dd>{store.data?.address ?? '-'}</dd>
              {reservation.status === 'CANCELLED' && (
                <>
                  <dt>취소</dt>
                  <dd>
                    {reservation.cancellationActor === 'OWNER' ? '매장에서 취소' : '직접 취소'}
                    {reservation.cancellationReason && <span className={styles.reason}>{reservation.cancellationReason}</span>}
                  </dd>
                </>
              )}
            </dl>
          }
        >
          <div className={styles.ticketHead}>
            <span className="t-label-13">{RESERVATION_STATUS_LABEL[display]}</span>
            <span className="t-caption-13 tnum">예약번호 {reservation.reservationId}</span>
          </div>
          <button type="button" className={styles.store} onClick={() => navigate(paths.storeDetail(reservation.storeId))}>
            {reservation.storeName}
          </button>
          <p className={`${styles.when} tnum`}>
            <span>{start.format('M월 D일 (dd)')}</span>
            <strong>{formatTime(reservation.reservationStartAt)}</strong>
          </p>
        </Ticket>
        {justCreated && <p className="t-body-14 text-secondary">방문 시간에 맞춰 매장에 도착해주세요.</p>}
      </div>

      <Dialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="예약을 취소할까요?"
        confirmLabel={cancel.isPending ? '취소 중…' : '예약 취소'}
        onConfirm={doCancel}
      >
        {when}, {reservation.partySize}명 예약이 취소돼요. 취소 후에는 되돌릴 수 없어요.
      </Dialog>
    </Page>
  )
}
