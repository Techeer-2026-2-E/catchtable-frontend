import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Info } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import { getPaymentBadge, PAYMENT_REFUND_STATUS_LABEL, PAYMENT_STATUS_LABEL } from '@/entities'
import { paymentKeys, usePaymentDetail, useSyncPayment, useUnconfirmedRefundRequest, useRequestUnconfirmedRefund } from '@/features/payment'
import { reservationKeys, useReservationDetail } from '@/features/reservation'
import { paths } from '@/shared/config'
import { getErrorMessage, refundKeyStorage } from '@/shared/lib'
import { dayjs } from '@/shared/lib/dayjs'
import { formatPrice, shortOrderId } from '@/shared/lib/format'
import { Badge, Banner, Button, Dialog, ErrorState, LoadingState, Page, toast, TopBar } from '@/shared/ui'
import styles from './PaymentDetailPage.module.css'

const formatDateTime = (value: string) => dayjs(value).format('M월 D일 A h:mm')

/**
 * 결제 상세 — GET /api/user/payments/{id}, 결과 재확인 POST /{id}/sync
 * 예약 확정 없이 승인된 결제는 전액 환불 요청 (POST /{id}/unconfirmed-refund),
 * 확정된 예약은 예약을 유지한 채 부분 환불 요청 화면으로 이동
 */
export function PaymentDetailPage() {
  const { paymentId: rawPaymentId } = useParams<{ paymentId: string }>()
  const paymentId = Number(rawPaymentId)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const detail = usePaymentDetail(paymentId)
  const sync = useSyncPayment()
  const refund = useUnconfirmedRefundRequest(paymentId, detail.data?.refundRequired ?? false)
  const requestRefund = useRequestUnconfirmedRefund()
  // 결제 응답에는 승인 이후에만 reservationId 가 있어서 선점 id(=예약 id)로 조회
  const reservation = useReservationDetail(detail.data?.reservationId ?? detail.data?.holdId ?? Number.NaN)
  const [refundOpen, setRefundOpen] = useState(false)
  const refundCompleted = refund.data?.refundStatus === 'COMPLETED'
  useEffect(() => {
    if (refundCompleted) {
      refundKeyStorage.clear('unconfirmed-refund', paymentId)
      queryClient.invalidateQueries({ queryKey: paymentKeys.detail(paymentId) })
    }
  }, [refundCompleted, paymentId, queryClient])

  if (detail.isPending || detail.isError) {
    return (
      <Page>
        <TopBar title="결제 상세" />
        {detail.isPending ? <LoadingState /> : <ErrorState message="결제를 찾을 수 없어요" onRetry={() => detail.refetch()} />}
      </Page>
    )
  }

  const payment = detail.data
  const r = reservation.data
  const remaining = Math.max(0, payment.amount - payment.canceledAmount)
  const refundStatus = refund.data?.refundStatus
  const refundPending = refundStatus === 'UNKNOWN' || refundStatus === 'REQUESTED'
  const refundable =
    payment.refundRequired &&
    ['DONE', 'PARTIAL_REFUNDED'].includes(payment.status) &&
    !refundPending &&
    !refundCompleted &&
    !refund.isPending &&
    !refund.isError
  const checkable =
    refundPending ||
    payment.status === 'TIMEOUT' ||
    payment.status === 'READY' ||
    payment.refunds.some((x) => x.status === 'UNKNOWN' || x.status === 'REQUESTED')
  // 예약을 유지한 부분 환불 — 방문 전 확정 예약이고 남은 금액이 있을 때
  const partialRefundable =
    !payment.refundRequired &&
    ['DONE', 'PARTIAL_REFUNDED'].includes(payment.status) &&
    remaining > 0 &&
    r?.status === 'CONFIRMED' &&
    dayjs(r.reservationStartAt).isAfter(dayjs())
  const approved = !!payment.approvedAt
  const badge = getPaymentBadge(payment)

  const doSync = () =>
    sync.mutate(paymentId, {
      onSuccess: (updated) => {
        queryClient.invalidateQueries({ queryKey: reservationKeys.all })
        if (payment.refundRequired) refund.refetch()
        toast(payment.refundRequired ? '환불 처리 결과를 다시 확인했어요' : `결제 상태: ${PAYMENT_STATUS_LABEL[updated.status]}`)
      },
      onError: (e) => toast(getErrorMessage(e, '결제 결과를 확인하지 못했어요')),
    })

  const doRefund = () => {
    if (!refundable || requestRefund.isPending) return
    // 확정 FAILED 뒤 사용자가 새 요청을 명시한 때에만 새 키를 만든다.
    if (refundStatus === 'FAILED') refundKeyStorage.clear('unconfirmed-refund', paymentId)
    const key = refundKeyStorage.get('unconfirmed-refund', paymentId)
    requestRefund.mutate(
      { paymentId, key },
      {
        onSuccess: () => setRefundOpen(false),
        onError: () => {
          setRefundOpen(false)
          toast('환불 요청 결과를 다시 확인해주세요. 같은 요청 정보를 보관했어요.')
        },
      },
    )
  }

  return (
    <Page
      bottom={
        refundable ? (
          <Button fullWidth disabled={requestRefund.isPending} onClick={() => setRefundOpen(true)}>
            {refundStatus === 'FAILED' ? '다시 전액 환불 요청' : `${formatPrice(remaining)} 전액 환불 요청`}
          </Button>
        ) : checkable ? (
          <Button fullWidth disabled={sync.isPending} onClick={doSync}>
            {sync.isPending ? '확인 중…' : refundPending ? '환불 결과 확인' : '결제 결과 다시 확인'}
          </Button>
        ) : approved ? (
          <div className={styles.actions}>
            <Button variant="outline" onClick={() => navigate(paths.paymentReceipt(paymentId))}>
              영수증 보기
            </Button>
            {partialRefundable && (
              <Button variant="soft" onClick={() => navigate(paths.paymentRefund(paymentId))}>
                부분 환불 요청
              </Button>
            )}
          </div>
        ) : undefined
      }
    >
      <TopBar title="결제 상세" />
      <div className={styles.wrap}>
        <div className={styles.head}>
          <p className={styles.title}>
            <span className="t-body-14 text-secondary">{payment.orderName}</span>
            <Badge tone={badge.tone}>{badge.label}</Badge>
          </p>
          <p className={`${styles.amount} tnum`}>{formatPrice(payment.amount)}</p>
          {payment.canceledAmount > 0 && payment.status !== 'REFUNDED' && (
            <p className="t-body-14 text-secondary tnum">남은 결제 금액 {formatPrice(remaining)}</p>
          )}
        </div>

        {payment.status === 'TIMEOUT' && <Banner tone="notice">결제 결과를 확인하고 있어요. 다시 결제하지 말고 결과를 확인해주세요.</Banner>}
        {payment.refundRequired && (
          <Banner tone={refundStatus === 'FAILED' ? 'danger' : 'notice'}>
            {refundCompleted || payment.status === 'REFUNDED'
              ? '예약이 확정되지 않은 결제의 전액 환불을 완료했어요.'
              : refundStatus === 'REQUESTED'
                ? '전액 환불 요청을 접수했어요. 처리 결과를 확인해주세요.'
                : refundStatus === 'UNKNOWN'
                  ? '환불 결과를 확인하고 있어요. 새로 요청하지 말고 결과를 확인해주세요.'
                  : refundStatus === 'FAILED'
                    ? '환불 요청이 거절됐어요. 확인 후 다시 요청할 수 있어요.'
                    : '결제는 됐지만 예약이 확정되지 못했어요. 결제한 금액을 모두 돌려받을 수 있어요.'}
          </Banner>
        )}
        {payment.refundRequired && refund.isError && (
          <div className={styles.retry}>
            <Banner tone="danger">환불 요청 내역을 확인하지 못했어요. 먼저 결과를 확인해주세요.</Banner>
            <Button variant="outline" onClick={() => refund.refetch()}>
              요청 내역 다시 확인
            </Button>
          </div>
        )}

        <dl className={styles.card}>
          {r && (
            <div>
              <dt>예약</dt>
              <dd className="tnum">
                {payment.refundRequired ? (
                  `${dayjs(r.reservationStartAt).format('M월 D일 (dd) A h:mm')}, ${r.partySize}명`
                ) : (
                  <Link to={paths.reservationDetail(r.reservationId)}>
                    {dayjs(r.reservationStartAt).format('M월 D일 (dd) A h:mm')}, {r.partySize}명
                  </Link>
                )}
              </dd>
            </div>
          )}
          {payment.refundRequired && (
            <div>
              <dt>예약 상태</dt>
              <dd className="text-danger">확정 안 됨</dd>
            </div>
          )}
          <div>
            <dt>결제 수단</dt>
            <dd>토스페이먼츠{payment.method ? `, ${payment.method}` : ''}</dd>
          </div>
          <div>
            <dt>승인 시각</dt>
            <dd className="tnum">{payment.approvedAt ? formatDateTime(payment.approvedAt) : '승인 전'}</dd>
          </div>
          <div>
            <dt>주문번호</dt>
            <dd className="text-tertiary" title={payment.orderId}>
              {shortOrderId(payment.orderId)}
            </dd>
          </div>
        </dl>

        {payment.refunds.length > 0 && (
          <section className={styles.card} aria-label="환불 내역">
            <h2 className="t-headline-16">환불 내역</h2>
            <ul className={styles.refunds}>
              {payment.refunds.map((x) => (
                <li key={x.refundId}>
                  <div className={styles.row}>
                    <span className="t-body-14">{x.cancelReason ?? '환불'}</span>
                    <strong className="t-body-14 tnum">-{formatPrice(x.refundAmount)}</strong>
                  </div>
                  <p className="t-caption-12 text-tertiary tnum">
                    {x.refundedAt ? `${formatDateTime(x.refundedAt)}, ` : ''}
                    {PAYMENT_REFUND_STATUS_LABEL[x.status]}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {payment.refundRequired && refundable && (
          <p className="t-caption-12 text-tertiary">요청하면 바로 접수되고, 완료되면 알려드려요. 같은 결제는 한 번만 환불돼요.</p>
        )}

        <p className={`${styles.notice} t-caption-13`}>
          <Info aria-hidden />
          {payment.receiptNotice}
        </p>
      </div>
      <Dialog
        isOpen={refundOpen}
        onClose={() => setRefundOpen(false)}
        title="전액 환불을 요청할까요?"
        confirmLabel={requestRefund.isPending ? '접수 중…' : '환불 요청'}
        onConfirm={doRefund}
      >
        예약이 확정되지 않아 남은 {formatPrice(remaining)}을 모두 환불해요. 접수 후 처리 결과를 확인할 수 있어요.
      </Dialog>
    </Page>
  )
}
