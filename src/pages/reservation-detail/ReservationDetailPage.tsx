import { useState } from 'react'
import { CalendarCheck, MapPin } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { getReservationDisplayStatus, RESERVATION_STATUS_LABEL, RESERVATION_STATUS_TONE } from '@/entities'
import { useCancelReservation, useRefundPreview, useReservationDetail } from '@/features/reservation'
import { useStoreDetail } from '@/features/store-detail'
import { paths, ROUTES } from '@/shared/config'
import { getErrorMessage } from '@/shared/lib'
import { dayjs } from '@/shared/lib/dayjs'
import { formatPrice, formatTime } from '@/shared/lib/format'
import { Badge, Banner, Button, Dialog, Divider, ErrorState, LoadingState, Page, Section, toast, TopBar } from '@/shared/ui'
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
  const refund = useRefundPreview(Number(reservationId), confirmOpen)
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

      {justCreated && (
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
          <Badge tone={RESERVATION_STATUS_TONE[display]}>{RESERVATION_STATUS_LABEL[display]}</Badge>
          <span className="t-caption-13 text-tertiary">예약번호 {reservation.reservationId}</span>
        </div>
        <button type="button" className={styles.store} onClick={() => navigate(paths.storeDetail(reservation.storeId))}>
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
          {reservation.status === 'CANCELLED' && (
            <>
              <dt>취소</dt>
              <dd>
                {reservation.cancellationActor === 'OWNER' ? '매장 취소' : '직접 취소'}
                {reservation.cancellationReason && ` · ${reservation.cancellationReason}`}
              </dd>
            </>
          )}
        </dl>
      </Section>
      <Divider thick />
      <Section title="매장 위치">
        <p className={styles.address}>
          <MapPin aria-hidden />
          {store.data?.address ?? '-'}
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
        confirmLabel={cancel.isPending ? '취소 중…' : '예약 취소'}
        onConfirm={doCancel}
      >
        {when} · {reservation.partySize}명 예약이 취소돼요. 취소 후에는 되돌릴 수 없어요.
        {!!refund.data?.paidAmount && (
          <>
            <br />
            예약금 {formatPrice(refund.data.paidAmount)} 중 {formatPrice(refund.data.refundAmount)}(
            {refund.data.refundRate}%)이 환불돼요.
          </>
        )}
      </Dialog>
    </Page>
  )
}
