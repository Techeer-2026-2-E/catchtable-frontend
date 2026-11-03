import { CreditCard } from 'lucide-react'
import { Link } from 'react-router'
import { PAYMENT_STATUS_LABEL } from '@/entities'
import { usePaymentList } from '@/features/payment'
import { paths } from '@/shared/config'
import { dayjs } from '@/shared/lib/dayjs'
import { formatPrice } from '@/shared/lib/format'
import { Button, EmptyState, ErrorState, LoadingState, Page, TopBar } from '@/shared/ui'
import styles from './PaymentsPage.module.css'

/** 결제 내역 — GET /api/user/payments (최신순) */
export function PaymentsPage() {
  const list = usePaymentList()
  const payments = list.data?.pages.flatMap((page) => page.payments) ?? []

  return (
    <Page>
      <TopBar title="결제 내역" />
      {list.isPending && <LoadingState />}
      {list.isError && <ErrorState onRetry={() => list.refetch()} />}
      {list.isSuccess && payments.length === 0 && <EmptyState icon={<CreditCard />} title="결제 내역이 없어요" />}
      {payments.length > 0 && (
        <ul className={styles.list}>
          {payments.map((payment) => (
            <li key={payment.paymentId}>
              <Link to={paths.paymentDetail(payment.paymentId)} className={styles.item}>
                <div className={styles.row}>
                  <span className="t-body-15">{payment.orderName}</span>
                  <strong className="tnum">{formatPrice(payment.amount)}</strong>
                </div>
                <div className={`${styles.row} t-caption-13 text-tertiary`}>
                  <span className="tnum">{payment.approvedAt ? dayjs(payment.approvedAt).format('YYYY.MM.DD HH:mm') : '승인 전'}</span>
                  <span>{PAYMENT_STATUS_LABEL[payment.status]}</span>
                </div>
              </Link>
            </li>
          ))}
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
