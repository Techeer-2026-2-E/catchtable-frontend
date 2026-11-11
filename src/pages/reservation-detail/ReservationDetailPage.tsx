import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { getReservationDisplayStatus, RESERVATION_STATUS_LABEL } from '@/entities'
import { useCancelReservation, useRefundPreview, useReservationDetail } from '@/features/reservation'
import { useStoreDetail } from '@/features/store-detail'
import { paths, ROUTES } from '@/shared/config'
import { getErrorCode, getErrorMessage, refundKeyStorage } from '@/shared/lib'
import { dayjs } from '@/shared/lib/dayjs'
import { formatPrice, formatTime } from '@/shared/lib/format'
import { Button, DetailSkeleton, Dialog, ErrorState, Page, Ticket, toast, TopBar } from '@/shared/ui'
import styles from './ReservationDetailPage.module.css'

/**
 * 예약 상세 — GET /api/user/reservations/{id}, 취소 POST /{id}/cancel
 * 환불이 있으면 취소 전에 예상액을 보여주고, 멱등키와 함께 취소한다. 환불이 확인된 뒤에만 예약이 취소된다
 */
export function ReservationDetailPage() {
  const { reservationId } = useParams<{ reservationId: string }>()
  const navigate = useNavigate()
  const { state } = useLocation() as { state: { justCreated?: boolean } | null }
  const { data: reservation, isPending, isError, refetch } = useReservationDetail(Number(reservationId))
  const store = useStoreDetail(reservation?.storeId ?? NaN)
  const cancel = useCancelReservation()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const preview = useRefundPreview(Number(reservationId), confirmOpen)

  if (isPending || isError) {
    return (
      <Page>
        <TopBar title="예약 상세" />
        {isPending ? <DetailSkeleton sections={2} /> : <ErrorState message="예약을 찾을 수 없어요" onRetry={() => refetch()} />}
      </Page>
    )
  }

  // 방금 만든 화면에서 바로 취소하면 확정 안내를 더 보여주지 않는다
  const justCreated = !!state?.justCreated && reservation.status === 'CONFIRMED'
  const display = getReservationDisplayStatus(reservation)
  const cancelable = display === 'CONFIRMED' && dayjs(reservation.reservationStartAt).isAfter(dayjs())
  const start = dayjs(reservation.reservationStartAt)
  const when = `${start.format('M월 D일 (dd)')} ${formatTime(reservation.reservationStartAt)}`

  const refundable = preview.data?.refundableAmount ?? 0
  // 결과 불명 뒤 재시도면 금액이 0으로 보여도 처음 키를 그대로 쓴다
  const pendingKey = refundKeyStorage.peek('customer-cancel', reservation.reservationId)

  const doCancel = () => {
    if (preview.isFetching || cancel.isPending) return
    const idempotencyKey = pendingKey ?? (refundable > 0 ? refundKeyStorage.get('customer-cancel', reservation.reservationId) : undefined)
    cancel.mutate(
      { reservationId: reservation.reservationId, idempotencyKey },
      {
        onSuccess: () => {
          refundKeyStorage.clear('customer-cancel', reservation.reservationId)
          setConfirmOpen(false)
          toast(refundable > 0 ? `예약을 취소하고 ${formatPrice(refundable)}을 환불했어요` : '예약을 취소했어요')
        },
        onError: (e) => {
          // 환불 금액이 새로 생겼으면 예상액을 다시 보여준다
          if (getErrorCode(e) === 'REFUND_NOT_COMPLETED') preview.refetch()
          toast(getErrorMessage(e, '취소하지 못했어요'))
        },
      },
    )
  }

  return (
    <Page
      bottom={
        reservation.status === 'PENDING_PAYMENT' ? (
          <Button fullWidth onClick={() => navigate(paths.paymentCheckout(reservation.reservationId))}>
            결제 이어하기
          </Button>
        ) : cancelable ? (
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
        {preview.isFetching && <p className={styles.refund}>환불 금액을 확인하고 있어요.</p>}
        {preview.data && preview.data.paidAmount > 0 && (
          <dl className={styles.refund}>
            <dt>결제 금액</dt>
            <dd className="tnum">{formatPrice(preview.data.paidAmount)}</dd>
            {preview.data.alreadyRefundedAmount > 0 && (
              <>
                <dt>이미 환불됨</dt>
                <dd className="tnum">{formatPrice(preview.data.alreadyRefundedAmount)}</dd>
              </>
            )}
            <dt>환불 예상</dt>
            <dd className="tnum">{formatPrice(preview.data.refundableAmount)}</dd>
            <dt>기준</dt>
            <dd>{preview.data.policyDescription}</dd>
          </dl>
        )}
      </Dialog>
    </Page>
  )
}
