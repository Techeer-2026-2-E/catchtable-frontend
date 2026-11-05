import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { findPaymentByHold, requestTossPayment, usePreparedPayment } from '@/features/payment'
import { useHold, useHoldCountdown, useReleaseHold } from '@/features/reservation'
import { useStoreDetail } from '@/features/store-detail'
import { paths, ROUTES } from '@/shared/config'
import { getErrorCode, getErrorMessage } from '@/shared/lib'
import { dayjs } from '@/shared/lib/dayjs'
import { formatPrice, formatTime } from '@/shared/lib/format'
import { Banner, Button, Dialog, EmptyState, ErrorState, LoadingState, Page, toast, TopBar } from '@/shared/ui'
import styles from './PaymentCheckoutPage.module.css'

const formatRemaining = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

/**
 * 예약금 결제 — 선점 조회 → prepare → Toss 결제창
 * 남은 시간은 서버 만료시각 기준이며 재조회로 늘어나지 않는다.
 * 화면을 떠나도 선점을 해제하지 않고(5분 만료가 기준), 사용자가 취소할 때만 해제한다.
 */
export function PaymentCheckoutPage() {
  const { holdId: rawHoldId } = useParams<{ holdId: string }>()
  const holdId = Number(rawHoldId)
  const navigate = useNavigate()
  const hold = useHold(holdId)
  const store = useStoreDetail(hold.data?.storeId ?? NaN)
  const remaining = useHoldCountdown(hold.data, hold.dataUpdatedAt)
  const prepared = usePreparedPayment(holdId, hold.data?.status === 'PENDING_PAYMENT' && hold.data.remainingSeconds > 0)
  const release = useReleaseHold()
  const [releaseOpen, setReleaseOpen] = useState(false)
  const [paying, setPaying] = useState(false)
  const [checking, setChecking] = useState(false)
  const opening = useRef(false)

  // 0초가 되면 서버 상태를 다시 확인 — 승인 진행 중이면 0초여도 만료가 아니다
  const refetchHold = hold.refetch
  const counted = !!hold.data && hold.data.status === 'PENDING_PAYMENT' && hold.data.remainingSeconds > 0
  useEffect(() => {
    if (counted && remaining === 0) refetchHold()
  }, [counted, remaining, refetchHold])

  const checkExistingPayment = async () => {
    setChecking(true)
    try {
      const payment = await findPaymentByHold(holdId)
      if (payment) navigate(paths.paymentDetail(payment.paymentId))
      else toast('결제 내역을 찾지 못했어요')
    } catch (e) {
      toast(getErrorMessage(e, '결제 내역을 불러오지 못했어요'))
    } finally {
      setChecking(false)
    }
  }

  if (hold.isPending || hold.isError) {
    return (
      <Page>
        <TopBar title="예약금 결제" />
        {hold.isPending ? <LoadingState /> : <ErrorState message="선점 정보를 찾을 수 없어요" onRetry={() => hold.refetch()} />}
      </Page>
    )
  }

  if (hold.data.status === 'CONFIRMED') return <Navigate to={paths.reservationDetail(hold.data.reservationId)} replace />

  const backToStore = () => navigate(paths.reservation(hold.data.storeId), { replace: true })

  if (hold.data.status !== 'PENDING_PAYMENT') {
    return (
      <Page bottom={<Button fullWidth onClick={backToStore}>다시 예약하기</Button>}>
        <TopBar title="예약금 결제" onLeadingClick={() => navigate(ROUTES.HOME)} />
        <EmptyState
          title={hold.data.status === 'EXPIRED' ? '결제 시간이 지났어요' : '선점이 해제됐어요'}
          description="자리가 반환되었어요. 예약 가능한 시간을 다시 확인해주세요."
        />
      </Page>
    )
  }

  const prepareCode = getErrorCode(prepared.error)
  const statusCheckRequired = prepareCode === 'PAYMENT_STATUS_CHECK_REQUIRED'
  // 0초인데 아직 PENDING_PAYMENT — 승인 진행·결과 불명일 수 있어 실패로 단정하지 않는다
  const awaitingResult = statusCheckRequired || remaining === 0
  const start = dayjs(hold.data.reservationStartAt)
  const hasTerms = !!prepared.data?.refundPolicy && !!prepared.data.refundPolicyName
    && !!prepared.data.refundPolicyNotice && Array.isArray(prepared.data.refundRules) && prepared.data.refundRules.length > 0
  const payable = !!prepared.data && hasTerms && remaining > 0 && !paying && !prepared.isFetching && !prepared.isError && !release.isPending

  const pay = async () => {
    if (!payable || opening.current) return
    opening.current = true
    setPaying(true)
    try {
      await requestTossPayment(async () => {
        const latest = await prepared.refetch({ throwOnError: true })
        if (!latest.data) throw new Error('주문을 다시 확인해주세요')
        if (!latest.data.refundPolicy || !latest.data.refundRules?.length) throw new Error('환불 기준을 다시 확인해주세요')
        return latest.data
      })
    } catch (e) {
      await refetchHold()
      // 사용자가 결제창을 닫은 경우 선점은 그대로 두고 다시 시도할 수 있게 한다
      if ((e as { code?: string }).code !== 'USER_CANCEL') {
        toast(e instanceof Error && e.message ? e.message : '결제창을 열지 못했어요')
      }
    } finally {
      opening.current = false
      setPaying(false)
    }
  }

  const doRelease = () =>
    release.mutate(holdId, {
      onSuccess: () => {
        toast('선점을 취소했어요')
        navigate(paths.storeDetail(hold.data.storeId), { replace: true })
      },
      onError: async (e) => {
        setReleaseOpen(false)
        const latest = await refetchHold()
        if (latest.data?.status === 'PENDING_PAYMENT' && latest.data.remainingSeconds > 0) {
          await prepared.refetch()
        }
        toast(getErrorMessage(e, '선점을 취소하지 못했어요'))
      },
    })

  return (
    <Page
      bottom={
        awaitingResult ? (
          <Button fullWidth disabled={checking} onClick={checkExistingPayment}>
            {checking ? '확인 중…' : '결제 결과 확인'}
          </Button>
        ) : (
          <Button fullWidth disabled={!payable} onClick={pay}>
            {paying ? '결제창 여는 중…' : prepared.data ? `${formatPrice(prepared.data.amount)} 결제하기` : '주문 준비 중…'}
          </Button>
        )
      }
    >
      <TopBar title="예약금 결제" />
      <div className={styles.wrap}>
        <div className={styles.timer} role="timer" aria-live="off">
          <span className="t-body-14 text-secondary">결제 남은 시간</span>
          <strong className={`${styles.remaining} tnum`}>{formatRemaining(remaining)}</strong>
        </div>

        {awaitingResult && (
          <Banner tone="notice">진행 중인 결제가 있을 수 있어요. 새로 결제하지 말고 결과를 먼저 확인해주세요.</Banner>
        )}
        {prepared.isError && !statusCheckRequired && (
          <Banner tone="danger">
            {prepareCode === 'PAYMENT_MISMATCH'
              ? '이 예약은 결제를 진행할 수 없어요. 선점을 취소하고 다시 예약해주세요.'
              : getErrorMessage(prepared.error, '주문을 준비하지 못했어요')}
          </Banner>
        )}
        {prepared.data && !hasTerms && !awaitingResult && (
          <Banner tone="danger">환불 기준을 확인하지 못했어요. 주문을 다시 확인해주세요.</Banner>
        )}
        {(prepared.isError || (prepared.data && !hasTerms)) && !statusCheckRequired && remaining > 0 && (
          <Button variant="outline" disabled={prepared.isFetching} onClick={() => prepared.refetch()}>
            주문 다시 확인
          </Button>
        )}

        <dl className={styles.info}>
          <dt>매장</dt>
          <dd>{store.data?.name ?? '-'}</dd>
          <dt>일시</dt>
          <dd className="tnum">
            {start.format('M월 D일 (dd)')} {formatTime(hold.data.reservationStartAt)}
          </dd>
          <dt>인원</dt>
          <dd>{hold.data.partySize}명</dd>
          {prepared.data && (
            <>
              <dt>주문명</dt>
              <dd>{prepared.data.orderName}</dd>
              <dt>결제 금액</dt>
              <dd className={`${styles.amount} tnum`}>{formatPrice(prepared.data.amount)}</dd>
            </>
          )}
        </dl>

        {hasTerms && prepared.data && (
          <section className={styles.policy}>
            <h2 className="t-headline-16">환불 기준</h2>
            <p className="t-body-14">{prepared.data.refundPolicyName} 환불 정책</p>
            <ul className="t-body-14">
              {prepared.data.refundRules.map((rule, index) => (
                <li key={rule.minDaysBefore}>
                  {rule.minDaysBefore === 0 ? '예약 당일' : `${rule.minDaysBefore}일 전${index === 0 ? '까지' : ''}`} {rule.refundRate}%
                </li>
              ))}
            </ul>
            <p className="t-caption-13 text-secondary">{prepared.data.refundPolicyNotice}</p>
          </section>
        )}

        <p className="t-body-14 text-secondary">
          {awaitingResult
            ? '결제 결과를 확인한 뒤 예약 상태를 안내해드릴게요.'
            : '결제를 마치면 예약이 확정돼요. 시간 안에 결제하지 않으면 자리가 반환돼요.'}
        </p>

        {!awaitingResult && (
          <Button variant="ghost" size="S" disabled={paying || release.isPending} onClick={() => setReleaseOpen(true)}>
            선점 취소
          </Button>
        )}
      </div>

      <Dialog
        isOpen={releaseOpen}
        onClose={() => setReleaseOpen(false)}
        title="선점을 취소할까요?"
        confirmLabel={release.isPending ? '취소 중…' : '선점 취소'}
        onConfirm={doRelease}
      >
        잡아둔 자리가 바로 반환돼요.
      </Dialog>
    </Page>
  )
}
