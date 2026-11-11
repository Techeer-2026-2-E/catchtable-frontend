import { CreditCard } from 'lucide-react'
import { Link } from 'react-router'
import { getPaymentBadge } from '@/entities'
import { usePaymentList } from '@/features/payment'
import { paths } from '@/shared/config'
import { dayjs } from '@/shared/lib/dayjs'
import { formatPrice } from '@/shared/lib/format'
import { Badge, Button, EmptyState, ErrorState, ListSkeleton, Page, TopBar } from '@/shared/ui'
import styles from './PaymentsPage.module.css'

/** 결제 내역 — GET /api/user/payments (최신순). 예약금 결제만 모아 보여준다 */
export function PaymentsPage() {
  const list = usePaymentList()
  const payments = list.data?.pages.flatMap((page) => page.payments) ?? []

  return (
    <Page muted>
      <TopBar title="결제 내역" />
      <p className={`${styles.hint} t-caption-13 text-secondary`}>
        예약금 결제만 모아 보여줘요. 웨이팅, 예약 이용 내역은 마이다이닝에서 볼 수 있어요.
      </p>
      {list.isPending && <ListSkeleton rows={4} trailing />}
      {list.isError && <ErrorState onRetry={() => list.refetch()} />}
      {list.isSuccess && payments.length === 0 && <EmptyState icon={<CreditCard />} title="결제 내역이 없어요" />}
      {payments.length > 0 && (
        <ul className={styles.list}>
          {payments.map((payment) => {
            const badge = getPaymentBadge(payment)
            return (
              <li key={payment.paymentId}>
                <Link to={paths.paymentDetail(payment.paymentId)} className={styles.item}>
                  <div className={styles.row}>
                    <span className="t-caption-13 text-tertiary tnum">
                      {payment.approvedAt ? dayjs(payment.approvedAt).format('YYYY. M. D') : '승인 전'}
                    </span>
                    <Badge tone={badge.tone}>{badge.label}</Badge>
                  </div>
                  <div className={styles.row}>
                    <span className="t-headline-16">{payment.orderName}</span>
                    <strong className="t-headline-16 tnum">{formatPrice(payment.amount)}</strong>
                  </div>
                  {payment.canceledAmount > 0 && (
                    <p className={`${styles.refunded} t-caption-12 text-tertiary tnum`}>{formatPrice(payment.canceledAmount)} 환불</p>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
      {list.hasNextPage && (
        <div className={styles.more}>
          <Button variant="ghost" size="S" disabled={list.isFetchingNextPage} onClick={() => list.fetchNextPage()}>
            {list.isFetchingNextPage ? '불러오는 중…' : '더 보기'}
          </Button>
        </div>
      )}
    </Page>
  )
}
