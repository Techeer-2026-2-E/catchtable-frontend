import { ExternalLink, Info } from 'lucide-react'
import { useParams } from 'react-router'
import { usePaymentDetail } from '@/features/payment'
import { useReservationDetail } from '@/features/reservation'
import { dayjs } from '@/shared/lib/dayjs'
import { formatPrice, shortOrderId } from '@/shared/lib/format'
import { ErrorState, LoadingState, Page, TopBar } from '@/shared/ui'
import styles from './PaymentReceiptPage.module.css'

/**
 * 영수증 — 결제 상세 응답으로 앱 안에서 그린 영수증
 * Toss 영수증 주소(receiptUrl)가 있으면 아래에 링크로 함께 보여준다
 */
export function PaymentReceiptPage() {
  const { paymentId } = useParams<{ paymentId: string }>()
  const detail = usePaymentDetail(Number(paymentId))
  const reservation = useReservationDetail(detail.data?.reservationId ?? detail.data?.holdId ?? Number.NaN)

  if (detail.isPending || detail.isError) {
    return (
      <Page>
        <TopBar title="영수증" leading="close" />
        {detail.isPending ? <LoadingState /> : <ErrorState message="결제를 찾을 수 없어요" onRetry={() => detail.refetch()} />}
      </Page>
    )
  }

  const p = detail.data
  const storeName = reservation.data?.storeName ?? p.orderName.replace(/ 예약금$/, '')
  const rows: [string, string][] = [
    ['가맹점', `${storeName} (캐치테이블)`],
    ['상품', '예약금'],
    ['결제 일시', p.approvedAt ? dayjs(p.approvedAt).format('YYYY-MM-DD HH:mm:ss') : '승인 전'],
    ['주문번호', shortOrderId(p.orderId)],
  ]

  return (
    <Page muted>
      <TopBar title="영수증" leading="close" />
      <div className={styles.wrap}>
        <section className={styles.receipt} aria-label="결제 영수증">
          <div className={styles.head}>
            <h2 className="t-title-18">결제 영수증</h2>
            <p className="t-caption-13 text-tertiary">토스페이먼츠 결제{p.method ? `, ${p.method}` : ''}</p>
          </div>
          <dl className={styles.rows}>
            {rows.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd className="tnum">{v}</dd>
              </div>
            ))}
          </dl>
          <dl className={styles.rows}>
            <div>
              <dt>결제 금액</dt>
              <dd className="tnum">
                <strong>{formatPrice(p.amount)}</strong>
              </dd>
            </div>
            {p.canceledAmount > 0 && (
              <div>
                <dt>취소 금액</dt>
                <dd className="tnum">-{formatPrice(p.canceledAmount)}</dd>
              </div>
            )}
            <div className={styles.total}>
              <dt>{p.canceledAmount > 0 ? '남은 금액' : '합계'}</dt>
              <dd className="tnum">{formatPrice(Math.max(0, p.amount - p.canceledAmount))}</dd>
            </div>
          </dl>
        </section>

        <p className={`${styles.notice} t-caption-13`}>
          <Info aria-hidden />
          {p.receiptNotice}
        </p>
        {p.receiptUrl && (
          <a href={p.receiptUrl} target="_blank" rel="noreferrer" className={`${styles.link} t-label-13`}>
            토스페이먼츠 영수증 열기
            <ExternalLink aria-hidden />
          </a>
        )}
      </div>
    </Page>
  )
}
