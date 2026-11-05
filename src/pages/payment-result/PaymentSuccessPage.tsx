import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import type { Payment } from '@/entities'
import { useNavigate, useSearchParams } from 'react-router'
import { useConfirmPayment } from '@/features/payment'
import { reservationKeys } from '@/features/reservation'
import { paths, ROUTES } from '@/shared/config'
import { getErrorCode, getErrorMessage } from '@/shared/lib'
import { Banner, Button, LoadingState, Page, TopBar } from '@/shared/ui'
import styles from './PaymentResult.module.css'

type Result = { kind: 'pending' } | { kind: 'unknown'; paymentId?: number } | { kind: 'failed'; message: string; code?: string }

// 결제가 일어났을 수 있는 오류 — 실패로 단정하지 않고 결과를 확인하게 한다
const UNKNOWN_RESULT_CODES = ['PAYMENT_RECONCILIATION_REQUIRED', 'PAYMENT_STATUS_CHECK_REQUIRED']

/**
 * 결제창 성공 복귀 — 인증만 끝난 상태이므로 서버 승인(confirm)을 거쳐야 예약이 확정된다
 * 같은 요청 재시도는 서버가 한 번만 처리한다
 */
export function PaymentSuccessPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const confirm = useConfirmPayment()
  const [result, setResult] = useState<Result>({ kind: 'pending' })
  const started = useRef(false)

  const paymentKey = params.get('paymentKey')
  const orderId = params.get('orderId')
  const amount = Number(params.get('amount'))
  const holdId = params.get('holdId')
  const mutateAsync = confirm.mutateAsync

  const applyPayment = useCallback(
    (payment: Payment) => {
      queryClient.invalidateQueries({ queryKey: reservationKeys.all })
      if (payment.reservationId && !payment.refundRequired && payment.status === 'DONE') {
        navigate(paths.reservationDetail(payment.reservationId), { replace: true, state: { justCreated: true } })
      } else if (payment.status === 'TIMEOUT' || payment.status === 'READY') {
        setResult({ kind: 'unknown', paymentId: payment.paymentId })
      } else if (payment.status === 'FAILED' || payment.status === 'CANCELED') {
        // 승인 거절은 200 으로 오며 선점도 함께 해제된다
        setResult({ kind: 'failed', message: '결제가 승인되지 않아 자리가 반환되었어요. 다시 예약해주세요.' })
      } else {
        navigate(paths.paymentDetail(payment.paymentId), { replace: true })
      }
    },
    [navigate, queryClient],
  )

  const run = useCallback(async () => {
    if (!paymentKey || !orderId || !Number.isFinite(amount) || amount <= 0) {
      setResult({ kind: 'failed', message: '결제 정보가 올바르지 않아요.' })
      return
    }
    setResult({ kind: 'pending' })
    try {
      applyPayment(await mutateAsync({ paymentKey, orderId, amount }))
    } catch (e) {
      const code = getErrorCode(e)
      const status = isAxiosError(e) ? e.response?.status : undefined
      if (!status || status >= 500 || status === 408 || status === 429 || !code || UNKNOWN_RESULT_CODES.includes(code)) {
        // 응답 유실·시간 초과 포함
        setResult({ kind: 'unknown' })
      } else {
        queryClient.invalidateQueries({ queryKey: reservationKeys.all })
        setResult({ kind: 'failed', code, message: getErrorMessage(e, '결제를 승인하지 못했어요.') })
      }
    }
  }, [paymentKey, orderId, amount, mutateAsync, applyPayment, queryClient])

  useEffect(() => {
    if (started.current) return
    started.current = true
    run()
  }, [run])

  if (result.kind === 'pending') {
    return (
      <Page>
        <TopBar title="결제 확인" leading="none" />
        <LoadingState label="결제를 확인하고 있어요" />
      </Page>
    )
  }

  if (result.kind === 'unknown') {
    return (
      <Page
        bottom={
          <>
            <Button variant="soft" className={styles.flex} onClick={() => navigate(result.paymentId ? paths.paymentDetail(result.paymentId) : ROUTES.PAYMENTS)}>
              결제 내역
            </Button>
            <Button className={styles.flex} onClick={run}>
              다시 확인
            </Button>
          </>
        }
      >
        <TopBar title="결제 확인" leading="none" />
        <div className={styles.wrap}>
          <h1 className="t-title-24">결제 결과를 확인하고 있어요</h1>
          <Banner tone="notice">아직 결과가 확인되지 않았어요. 다시 결제하지 말고 결과를 확인해주세요.</Banner>
        </div>
      </Page>
    )
  }

  return (
    <Page
      bottom={
        <Button fullWidth onClick={() => navigate(holdId ? paths.paymentCheckout(holdId) : ROUTES.HOME, { replace: true })}>
          {holdId ? '결제 화면으로' : '홈으로'}
        </Button>
      }
    >
      <TopBar title="결제 확인" leading="none" />
      <div className={styles.wrap}>
        <h1 className="t-title-24">결제하지 못했어요</h1>
        <p className="t-body-14 text-secondary">{result.message}</p>
      </div>
    </Page>
  )
}
