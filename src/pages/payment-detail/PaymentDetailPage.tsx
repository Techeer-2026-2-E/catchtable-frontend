import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router'
import { PAYMENT_REFUND_STATUS_LABEL, PAYMENT_STATUS_LABEL } from '@/entities'
import { usePaymentDetail, useSyncPayment } from '@/features/payment'
import { reservationKeys } from '@/features/reservation'
import { paths } from '@/shared/config'
import { getErrorMessage } from '@/shared/lib'
import { dayjs } from '@/shared/lib/dayjs'
import { formatPrice } from '@/shared/lib/format'
import { Banner, Button, ErrorState, LoadingState, Page, toast, TopBar } from '@/shared/ui'
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

  if (detail.isPending || detail.isError) {
    return (
      <Page>
        <TopBar title="결제 상세" />
        {detail.isPending ? <LoadingState /> : <ErrorState message="결제를 찾을 수 없어요" onRetry={() => detail.refetch()} />}
      </Page>
    )
  }

  const payment = detail.data
  const checkable = payment.status === 'TIMEOUT' || payment.status === 'READY' || payment.refunds.some((r) => r.status === 'UNKNOWN' || r.status === 'REQUESTED')
  const doSync = () =>
    sync.mutate(paymentId, {
      onSuccess: (updated) => {
        queryClient.invalidateQueries({ queryKey: reservationKeys.all })
        toast(`결제 상태: ${PAYMENT_STATUS_LABEL[updated.status]}`)
      },
      onError: (e) => toast(getErrorMessage(e, '결제 결과를 확인하지 못했어요')),
    })

  return (
    <Page
      bottom={
        checkable ? (
          <Button fullWidth disabled={sync.isPending} onClick={doSync}>
            {sync.isPending ? '확인 중…' : '결제 결과 다시 확인'}
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
        {payment.refundRequired && <Banner tone="danger">결제는 승인됐지만 예약이 확정되지 않았어요. 환불이 필요한 결제예요.</Banner>}

        <dl className={styles.info}>
          <dt>주문명</dt>
          <dd>{payment.orderName}</dd>
          <dt>주문번호</dt>
          <dd className={styles.orderId}>{payment.orderId}</dd>
          <dt>결제 수단</dt>
          <dd>{payment.method ?? '-'}</dd>
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
            <Link to={payment.receiptUrl} target="_blank" rel="noreferrer" className="t-body-14">
              영수증 보기
            </Link>
          )}
          <p className="t-caption-13 text-tertiary">{payment.receiptNotice}</p>
        </div>
      </div>
    </Page>
  )
}
