import { useState } from 'react'
import { isAxiosError } from 'axios'
import { useNavigate, useParams } from 'react-router'
import { usePaymentDetail, useRefundPayment } from '@/features/payment'
import { useRefundPreview } from '@/features/reservation'
import { paths } from '@/shared/config'
import { getErrorCode, getErrorMessage, refundKeyStorage } from '@/shared/lib'
import { formatPrice } from '@/shared/lib/format'
import { Banner, Button, Chip, ChipGroup, ErrorState, LoadingState, Page, TextField, Textarea, toast, TopBar } from '@/shared/ui'
import styles from './PaymentRefundPage.module.css'

const QUICK_AMOUNTS = [5_000, 10_000]
const ERROR_TEXT: Record<string, string> = {
  REFUND_AMOUNT_EXCEEDED: '지금 환불받을 수 있는 금액보다 많아요',
  RESERVATION_NOT_CANCELLABLE: '방문 시각이 지났거나 이미 방문한 예약이라 환불할 수 없어요',
  PAYMENT_NOT_REFUNDABLE: '환불할 수 없는 결제예요',
}

/**
 * 부분 환불 요청 — 예약은 그대로 두고 예약금 일부만 돌려받기
 * 한도: GET /api/user/reservations/{id}/refund-preview 의 refundableAmount
 * 요청: POST /api/user/payments/{paymentId}/cancel { cancelReason, cancelAmount } + Idempotency-Key
 */
export function PaymentRefundPage() {
  const { paymentId: raw } = useParams<{ paymentId: string }>()
  const paymentId = Number(raw)
  const navigate = useNavigate()
  const detail = usePaymentDetail(paymentId)
  const reservationId = detail.data?.reservationId ?? Number.NaN
  const preview = useRefundPreview(reservationId, Number.isFinite(reservationId))
  const refund = useRefundPayment()
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')

  if (detail.isPending || (Number.isFinite(reservationId) && preview.isPending)) {
    return (
      <Page>
        <TopBar title="환불 요청" />
        <LoadingState />
      </Page>
    )
  }
  if (detail.isError || preview.isError || !preview.data) {
    return (
      <Page>
        <TopBar title="환불 요청" />
        <ErrorState
          message={preview.isError ? getErrorMessage(preview.error, '지금은 환불을 요청할 수 없는 예약이에요') : '결제를 찾을 수 없어요'}
          onRetry={() => (detail.isError ? detail.refetch() : preview.refetch())}
        />
      </Page>
    )
  }

  const p = preview.data
  const max = p.refundableAmount
  const value = Number(amount)
  const amountError = amount && (value < 1 || value > max) ? `1원부터 ${formatPrice(max)}까지 입력할 수 있어요` : undefined
  const canSubmit = max > 0 && value >= 1 && value <= max && reason.trim().length > 0 && !refund.isPending

  const submit = () => {
    const key = refundKeyStorage.get('partial-refund', paymentId)
    refund.mutate(
      { paymentId, key, cancelReason: reason.trim(), cancelAmount: value },
      {
        onSuccess: (result) => {
          refundKeyStorage.clear('partial-refund', paymentId)
          toast(`${formatPrice(result.refundAmount)}을 환불했어요`)
          navigate(paths.paymentDetail(paymentId), { replace: true })
        },
        onError: (e) => {
          const status = isAxiosError(e) ? e.response?.status : undefined
          // 서버가 판정한 거절(4xx)만 새 요청으로 본다. 결과를 모르면 같은 키를 보관하고 상세에서 확인
          if (status && status < 500) {
            refundKeyStorage.clear('partial-refund', paymentId)
            toast(ERROR_TEXT[getErrorCode(e) ?? ''] ?? getErrorMessage(e, '환불하지 못했어요'))
          } else {
            toast('환불 결과를 확인하지 못했어요. 결제 상세에서 결과를 확인해주세요.')
            navigate(paths.paymentDetail(paymentId), { replace: true })
          }
        },
      },
    )
  }

  return (
    <Page
      bottom={
        <Button fullWidth disabled={!canSubmit} onClick={submit}>
          {refund.isPending ? '요청 중…' : value > 0 && !amountError ? `${formatPrice(value)} 환불 요청` : '환불 요청'}
        </Button>
      }
    >
      <TopBar title="환불 요청" />
      <div className={styles.wrap}>
        <Banner tone="notice">예약은 그대로 두고 예약금 일부만 돌려받아요. 예약을 취소하려면 예약 상세에서 취소해 주세요.</Banner>

        <dl className={styles.summary}>
          <div>
            <dt>결제한 예약금</dt>
            <dd className="tnum">{formatPrice(p.paidAmount)}</dd>
          </div>
          <div>
            <dt>이미 환불한 금액</dt>
            <dd className="tnum">{formatPrice(p.alreadyRefundedAmount)}</dd>
          </div>
          <div className={styles.max}>
            <dt>지금 환불받을 수 있는 금액</dt>
            <dd className="tnum">{formatPrice(max)}</dd>
          </div>
          <p className="t-caption-12 text-tertiary">
            지금 기준 환불율 {p.refundRate}%. {p.policyDescription}
          </p>
        </dl>

        {max === 0 ? (
          <Banner tone="danger">지금은 돌려받을 수 있는 금액이 없어요.</Banner>
        ) : (
          <>
            <div className={styles.amount}>
              <TextField
                label="환불 금액"
                inputMode="numeric"
                placeholder="0"
                value={amount ? value.toLocaleString('ko-KR') : ''}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
                error={amountError}
                helperText={`1원부터 ${formatPrice(max)}까지 입력할 수 있어요`}
              />
              <span className={`${styles.unit} t-body-16 text-secondary`}>원</span>
            </div>
            <ChipGroup label="빠른 금액 선택">
              {QUICK_AMOUNTS.filter((a) => a < max).map((a) => (
                <Chip key={a} size="S" selected={value === a} onClick={() => setAmount(String(a))}>
                  {formatPrice(a)}
                </Chip>
              ))}
              <Chip size="S" selected={value === max} onClick={() => setAmount(String(max))}>
                전액 {formatPrice(max)}
              </Chip>
            </ChipGroup>
            <Textarea
              label="환불 사유"
              placeholder="예: 인원이 한 명 줄었어요"
              rows={3}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </>
        )}
      </div>
    </Page>
  )
}
