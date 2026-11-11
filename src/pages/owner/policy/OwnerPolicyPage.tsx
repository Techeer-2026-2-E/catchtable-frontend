import { useState } from 'react'
import { useParams } from 'react-router'
import { REFUND_POLICY_LABEL, REFUND_POLICY_RULES, type DepositPolicy, type RefundPolicy, type ReservationPolicy } from '@/entities'
import {
  useDepositPolicy,
  useReplaceDepositPolicy,
  useReplaceReservationPolicy,
  useReservationPolicy,
} from '@/features/owner-store'
import { getErrorMessage } from '@/shared/lib'
import { Banner, Button, Chip, ChipGroup, Divider, ErrorState, ListSkeleton, Page, Section, Stepper, TextField, toast, Toggle, TopBar } from '@/shared/ui'
import styles from './OwnerPolicyPage.module.css'

const REFUND_POLICIES: RefundPolicy[] = ['FLEXIBLE', 'STANDARD', 'STRICT']
const DEFAULT_DEPOSIT = 10_000
const minutesLabel = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}시간${m % 60 ? ` ${m % 60}분` : ''}` : `${m}분`)

/**
 * 기능명세「예약 정책 관리」「예약금 정책 설정」
 * GET·PUT /api/owner/stores/{storeId}/reservation-policy · /deposit-policy
 */
export function OwnerPolicyPage() {
  const { storeId } = useParams<{ storeId: string }>()
  const id = Number(storeId)
  const policy = useReservationPolicy(id)
  const deposit = useDepositPolicy(id)

  if (policy.isPending || deposit.isPending || policy.isError || deposit.isError) {
    const retry = () => Promise.all([policy.refetch(), deposit.refetch()])
    return (
      <Page>
        <TopBar title="예약 정책 관리" />
        {policy.isError || deposit.isError ? <ErrorState onRetry={retry} /> : <ListSkeleton rows={4} trailing />}
      </Page>
    )
  }
  return (
    <PolicyForm
      key={`${policy.dataUpdatedAt}-${deposit.dataUpdatedAt}`}
      storeId={id}
      initial={policy.data}
      initialDeposit={deposit.data}
    />
  )
}

function PolicyForm({
  storeId,
  initial,
  initialDeposit,
}: {
  storeId: number
  initial: ReservationPolicy
  initialDeposit: DepositPolicy
}) {
  const [policy, setPolicy] = useState(initial)
  const [depositEnabled, setDepositEnabled] = useState(initialDeposit.depositEnabled)
  const [amount, setAmount] = useState(String(initialDeposit.depositAmount || DEFAULT_DEPOSIT))
  const [refundPolicy, setRefundPolicy] = useState<RefundPolicy>(initialDeposit.refundPolicy ?? 'STANDARD')
  const replace = useReplaceReservationPolicy(storeId)
  const replaceDeposit = useReplaceDepositPolicy(storeId)
  const set = (patch: Partial<ReservationPolicy>) => setPolicy((p) => ({ ...p, ...patch }))

  const graceInvalid = policy.arrivalGraceMinutes >= policy.reservationDurationMinutes
  const depositAmount = Number(amount)
  const amountInvalid = depositEnabled && (!Number.isInteger(depositAmount) || depositAmount < 100 || depositAmount % 100 !== 0)
  const saving = replace.isPending || replaceDeposit.isPending

  const save = async () => {
    try {
      await replace.mutateAsync(policy)
      await replaceDeposit.mutateAsync(
        depositEnabled
          ? { depositEnabled: true, depositAmount, refundPolicy }
          : { depositEnabled: false, depositAmount: 0, refundPolicy: null },
      )
      toast('예약 정책을 저장했어요')
    } catch (e) {
      toast(getErrorMessage(e, '저장하지 못했어요'))
    }
  }

  return (
    <Page
      bottom={
        <Button fullWidth disabled={graceInvalid || amountInvalid || saving} onClick={save}>
          {saving ? '저장 중…' : '저장'}
        </Button>
      }
    >
      <TopBar title="예약 정책 관리" />

      <Section title="예약 시간 단위" action={<span className="t-caption-13 text-tertiary">고객이 고를 수 있는 간격</span>}>
        <Stepper
          label="예약 시간 단위"
          value={policy.reservationSlotMinutes}
          onChange={(v) => set({ reservationSlotMinutes: v })}
          min={10}
          max={120}
          step={10}
          format={minutesLabel}
        />
      </Section>

      <Section title="1회 이용 시간" action={<span className="t-caption-13 text-tertiary">이후 자동 이용 완료</span>}>
        <Stepper
          label="1회 이용 시간"
          value={policy.reservationDurationMinutes}
          onChange={(v) => set({ reservationDurationMinutes: v })}
          min={30}
          max={300}
          step={30}
          format={minutesLabel}
        />
      </Section>

      <Section title="도착 유예 시간" action={<span className="t-caption-13 text-tertiary">지나면 노쇼 처리 가능</span>}>
        <Stepper
          label="도착 유예 시간"
          value={policy.arrivalGraceMinutes}
          onChange={(v) => set({ arrivalGraceMinutes: v })}
          min={0}
          max={60}
          step={5}
          unit="분"
        />
      </Section>
      {graceInvalid && (
        <Section>
          <Banner tone="danger">도착 유예 시간은 1회 이용 시간보다 짧아야 해요.</Banner>
        </Section>
      )}

      <Divider thick />

      <Section title="예약 오픈 기간" action={<span className="t-caption-13 text-tertiary">오늘부터 며칠 뒤까지</span>}>
        <Stepper
          label="예약 오픈 기간"
          value={policy.bookingOpenDays}
          onChange={(v) => set({ bookingOpenDays: v })}
          min={1}
          max={90}
          unit="일"
        />
      </Section>

      <Section title="예약 마감" action={<span className="t-caption-13 text-tertiary">방문 시각 기준</span>}>
        <Stepper
          label="예약 마감"
          value={policy.bookingDeadlineMinutes}
          onChange={(v) => set({ bookingDeadlineMinutes: v })}
          min={0}
          max={1440}
          step={30}
          format={(m) => (m === 0 ? '직전까지' : `${minutesLabel(m)} 전`)}
        />
      </Section>

      <Divider thick />

      <Section title="예약금" action={<span className="t-caption-13 text-tertiary">손님이 예약할 때 미리 결제</span>}>
        <div className={styles.toggleRow}>
          <span className="t-body-15">예약금 받기</span>
          <Toggle checked={depositEnabled} label="예약금 받기" onChange={setDepositEnabled} />
        </div>
        {depositEnabled && (
          <div className={styles.amount}>
            <TextField
              label="예약 1건당 예약금"
              inputMode="numeric"
              value={amount ? Number(amount).toLocaleString('ko-KR') : ''}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
              error={amountInvalid ? '100원 단위로 입력해주세요' : undefined}
            />
            <span className={`${styles.unit} t-body-16 text-secondary`}>원</span>
          </div>
        )}
      </Section>

      {depositEnabled && (
        <Section title="환불 정책" action={<span className="t-caption-13 text-tertiary">예약 취소 시 돌려주는 비율</span>}>
          <ChipGroup label="환불 정책">
            {REFUND_POLICIES.map((p) => (
              <Chip key={p} selected={refundPolicy === p} onClick={() => setRefundPolicy(p)}>
                {REFUND_POLICY_LABEL[p]}
              </Chip>
            ))}
          </ChipGroup>
          <dl className={styles.rules}>
            {REFUND_POLICY_RULES[refundPolicy].map(([when, rate]) => (
              <div key={when}>
                <dt className="t-caption-13 text-secondary">{when}</dt>
                <dd className="t-caption-13">{rate}</dd>
              </div>
            ))}
          </dl>
        </Section>
      )}

      <div className={styles.spacer} />
    </Page>
  )
}
