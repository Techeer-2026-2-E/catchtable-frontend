import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router'
import { PAYMENT_REFUND_STATUS_LABEL, PAYMENT_STATUS_LABEL } from '@/entities'
import { paymentKeys, usePaymentDetail, useSyncPayment, useUnconfirmedRefundRequest, useRequestUnconfirmedRefund } from '@/features/payment'
import { reservationKeys } from '@/features/reservation'
import { paths } from '@/shared/config'
import { getErrorMessage, refundKeyStorage } from '@/shared/lib'
import { dayjs } from '@/shared/lib/dayjs'
import { formatPrice } from '@/shared/lib/format'
import { Banner, Button, Dialog, ErrorState, LoadingState, Page, toast, TopBar } from '@/shared/ui'
import styles from './PaymentDetailPage.module.css'

const formatDateTime = (value: string) => dayjs(value).format('YYYY.MM.DD HH:mm')

/** 결제 상세 — GET /api/user/payments/{id}, 결과 재확인 POST /{id}/sync */
export function PaymentDetailPage() {
  const { paymentId: rawPaymentId } = useParams<{ paymentId: string }>()
  const paymentId = Number(rawPaymentId)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const detail = usePaymentDetail(paymentId)
  const sync = useSyncPayment()
  const refund = useUnconfirmedRefundRequest(paymentId, detail.data?.refundRequired ?? false)
  const requestRefund = useRequestUnconfirmedRefund()
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
  const refundStatus = refund.data?.refundStatus
  const refundPending = refundStatus === 'UNKNOWN' || refundStatus === 'REQUESTED'
  const refundable = payment.refundRequired && ['DONE', 'PARTIAL_REFUNDED'].includes(payment.status)
    && !refundPending && !refundCompleted && !refund.isPending && !refund.isError
  const checkable = refundPending || payment.status === 'TIMEOUT' || payment.status === 'READY' || payment.refunds.some((r) => r.status === 'UNKNOWN' || r.status === 'REQUESTED')
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
    requestRefund.mutate({ paymentId, key }, {
      onSuccess: () => setRefundOpen(false),
      onError: () => {
        setRefundOpen(false)
        toast('환불 요청 결과를 다시 확인해주세요. 같은 요청 정보를 보관했어요.')
      },
    })
  }

  return (
    <Page
      bottom={
        refundable ? (
          <Button fullWidth disabled={requestRefund.isPending} onClick={() => setRefundOpen(true)}>
            {refundStatus === 'FAILED' ? '다시 전액 환불 요청' : '전액 환불 요청'}
          </Button>
        ) : checkable ? (
          <Button fullWidth disabled={sync.isPending} onClick={doSync}>
            {sync.isPending ? '확인 중…' : refundPending ? '환불 결과 확인' : '결제 결과 다시 확인'}
          </Button>
        ) : payment.reservationId && !payment.refundRequired ? (
          <Button fullWidth variant="outline" onClick={() => navigate(paths.reservationDetail(payment.reservationId!))}>
            예약 보기
          </Button>
        ) : undefined
      }
    >
      <TopBar title="결제 상세" />
      <div className={styles.wrap}>
        <div>
          <p className="t-body-14 text-secondary">{PAYMENT_STATUS_LABEL[payment.status]}</p>
          <p className={`${styles.amount} tnum`}>{formatPrice(payment.amount)}</p>
        </div>

        {payment.status === 'TIMEOUT' && <Banner tone="notice">결제 결과를 확인하고 있어요. 다시 결제하지 말고 결과를 확인해주세요.</Banner>}
        {payment.refundRequired && (
          <Banner tone={refundCompleted || payment.status === 'REFUNDED' ? 'notice' : 'danger'}>
            {refundCompleted || payment.status === 'REFUNDED'
              ? '예약이 확정되지 않은 결제의 전액 환불을 완료했어요.'
              : refundStatus === 'REQUESTED'
                ? '전액 환불 요청을 접수했어요. 처리 결과를 확인해주세요.'
                : refundStatus === 'UNKNOWN'
                  ? '환불 결과를 확인하고 있어요. 새로 요청하지 말고 결과를 확인해주세요.'
                  : refundStatus === 'FAILED'
                    ? '환불 요청이 거절됐어요. 확인 후 다시 요청할 수 있어요.'
                    : '결제는 승인됐지만 예약이 확정되지 않았어요. 남은 금액을 전액 환불받을 수 있어요.'}
          </Banner>
        )}
        {payment.refundRequired && refund.isError && (
          <div>
            <Banner tone="danger">환불 요청 내역을 확인하지 못했어요. 먼저 결과를 확인해주세요.</Banner>
            <Button variant="outline" onClick={() => refund.refetch()}>요청 내역 다시 확인</Button>
          </div>
        )}

        <dl className={styles.info}>
          <dt>주문명</dt>
          <dd>{payment.orderName}</dd>
          <dt>주문번호</dt>
          <dd className={styles.orderId}>{payment.orderId}</dd>
          <dt>결제 수단</dt>
          <dd>토스페이먼츠</dd>
          <dt>승인 시각</dt>
          <dd className="tnum">{payment.approvedAt ? formatDateTime(payment.approvedAt) : '-'}</dd>
          <dt>환불 금액</dt>
          <dd className="tnum">{formatPrice(payment.canceledAmount)}</dd>
        </dl>

        {payment.refunds.length > 0 && (
          <section className={styles.refunds}>
            <h2 className="t-label-13">환불 이력</h2>
            <ul>
              {payment.refunds.map((refund) => (
                <li key={refund.refundId} className={styles.refund}>
                  <div className={styles.row}>
                    <span>{PAYMENT_REFUND_STATUS_LABEL[refund.status]}</span>
                    <strong className="tnum">{formatPrice(refund.refundAmount)}</strong>
                  </div>
                  <div className={`${styles.row} t-caption-13 text-tertiary`}>
                    <span>{refund.cancelReason ?? '-'}</span>
                    <span className="tnum">{refund.refundedAt ? formatDateTime(refund.refundedAt) : ''}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className={styles.receipt}>
          {payment.receiptUrl && (
            <a href={payment.receiptUrl} target="_blank" rel="noreferrer" className="t-body-14">
              영수증 보기
            </a>
          )}
          <p className="t-caption-13 text-tertiary">{payment.receiptNotice}</p>
        </div>
      </div>
      <Dialog isOpen={refundOpen} onClose={() => setRefundOpen(false)} title="전액 환불을 요청할까요?"
        confirmLabel={requestRefund.isPending ? '접수 중…' : '환불 요청'} onConfirm={doRefund}>
        예약이 확정되지 않아 남은 {formatPrice(Math.max(0, payment.amount - payment.canceledAmount))}을 전액 환불해요. 접수 후 처리 결과를 확인할 수 있어요.
      </Dialog>
    </Page>
  )
}
