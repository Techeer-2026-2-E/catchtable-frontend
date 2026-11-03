import { useNavigate, useSearchParams } from 'react-router'
import { paths, ROUTES } from '@/shared/config'
import { Button, Page, TopBar } from '@/shared/ui'
import styles from './PaymentResult.module.css'

const USER_CANCEL_CODES = ['PAY_PROCESS_CANCELED', 'USER_CANCEL']

/** 결제창 실패·취소 복귀 — 승인 전 단계라 선점은 유지되고 남은 시간 안에 다시 시도할 수 있다 */
export function PaymentFailPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const holdId = params.get('holdId')
  const canceled = USER_CANCEL_CODES.includes(params.get('code') ?? '')

  return (
    <Page
      bottom={
        <Button fullWidth onClick={() => navigate(holdId ? paths.paymentCheckout(holdId) : ROUTES.HOME, { replace: true })}>
          {holdId ? '결제 화면으로' : '홈으로'}
        </Button>
      }
    >
      <TopBar title="결제 결과" leading="none" />
      <div className={styles.wrap}>
        <h1 className="t-title-24">{canceled ? '결제를 취소했어요' : '결제하지 못했어요'}</h1>
        {!canceled && params.get('message') && <p className="t-body-14 text-secondary">{params.get('message')}</p>}
        {holdId && <p className="t-body-14 text-secondary">남은 시간 안에는 다시 결제할 수 있어요.</p>}
      </div>
    </Page>
  )
}
