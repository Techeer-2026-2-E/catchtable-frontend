import { useState } from 'react'
import { useParams } from 'react-router'
import type { ReservationPolicy } from '@/entities'
import { useMyStores, useReplaceReservationPolicy, useReservationPolicy } from '@/features/owner-store'
import { getErrorMessage } from '@/shared/lib'
import { formatPrice } from '@/shared/lib/format'
import { Banner, Button, Chip, ChipGroup, Divider, ErrorState, LoadingState, Page, Section, toast, TopBar } from '@/shared/ui'
import styles from './OwnerPolicyPage.module.css'

const SLOT_OPTIONS = [15, 30, 60]
const DURATION_OPTIONS = [60, 90, 120, 150]
const GRACE_OPTIONS = [5, 10, 15, 20]
const OPEN_DAYS_OPTIONS = [7, 14, 30, 60]
const DEADLINE_OPTIONS = [0, 30, 60, 180]
const minutesLabel = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}시간${m % 60 ? ` ${m % 60}분` : ''}` : `${m}분`)

/**
 * 기능명세「예약 정책 관리」
 * GET·PUT /api/owner/stores/{storeId}/reservation-policy (백엔드 dev 구현)
 */
export function OwnerPolicyPage() {
  const { storeId } = useParams<{ storeId: string }>()
  const id = Number(storeId)
  const { data, isPending, isError, refetch, dataUpdatedAt } = useReservationPolicy(id)

  if (isPending || isError) {
    return (
      <Page>
        <TopBar title="예약 정책 관리" />
        {isPending ? <LoadingState /> : <ErrorState onRetry={() => refetch()} />}
      </Page>
    )
  }
  return <PolicyForm key={dataUpdatedAt} storeId={id} initial={data} />
}

function PolicyForm({ storeId, initial }: { storeId: number; initial: ReservationPolicy }) {
  const [policy, setPolicy] = useState(initial)
  const replace = useReplaceReservationPolicy(storeId)
  const store = useMyStores().data?.find((s) => s.id === storeId)
  const set = (patch: Partial<ReservationPolicy>) => setPolicy((p) => ({ ...p, ...patch }))
  const invalid = policy.arrivalGraceMinutes >= policy.reservationDurationMinutes

  const save = () =>
    replace.mutate(policy, {
      onSuccess: () => toast('예약 정책을 저장했어요'),
      onError: (e) => toast(getErrorMessage(e, '저장하지 못했어요')),
    })

  return (
    <Page
      bottom={
        <Button fullWidth disabled={invalid || replace.isPending} onClick={save}>
          {replace.isPending ? '저장 중…' : '저장'}
        </Button>
      }
    >
      <TopBar title="예약 정책 관리" />

      <Section title="예약 시간 단위" action={<span className="t-caption-13 text-tertiary">고객이 고를 수 있는 간격</span>}>
        <ChipGroup label="예약 시간 단위">
          {SLOT_OPTIONS.map((m) => (
            <Chip key={m} selected={policy.reservationSlotMinutes === m} onClick={() => set({ reservationSlotMinutes: m })}>
              {minutesLabel(m)}
            </Chip>
          ))}
        </ChipGroup>
      </Section>

      <Section title="1회 이용 시간" action={<span className="t-caption-13 text-tertiary">이후 자동 이용 완료</span>}>
        <ChipGroup label="1회 이용 시간">
          {DURATION_OPTIONS.map((m) => (
            <Chip
              key={m}
              selected={policy.reservationDurationMinutes === m}
              onClick={() => set({ reservationDurationMinutes: m })}
            >
              {minutesLabel(m)}
            </Chip>
          ))}
        </ChipGroup>
      </Section>

      <Section title="도착 유예 시간" action={<span className="t-caption-13 text-tertiary">지나면 노쇼 처리 가능</span>}>
        <ChipGroup label="도착 유예 시간">
          {GRACE_OPTIONS.map((m) => (
            <Chip key={m} selected={policy.arrivalGraceMinutes === m} onClick={() => set({ arrivalGraceMinutes: m })}>
              {m}분
            </Chip>
          ))}
        </ChipGroup>
      </Section>
      {invalid && (
        <Section>
          <Banner tone="danger">도착 유예 시간은 1회 이용 시간보다 짧아야 해요.</Banner>
        </Section>
      )}

      <Divider thick />

      <Section title="예약 오픈 기간" action={<span className="t-caption-13 text-tertiary">오늘부터 며칠 뒤까지</span>}>
        <ChipGroup label="예약 오픈 기간">
          {OPEN_DAYS_OPTIONS.map((d) => (
            <Chip key={d} selected={policy.bookingOpenDays === d} onClick={() => set({ bookingOpenDays: d })}>
              {d}일
            </Chip>
          ))}
        </ChipGroup>
      </Section>

      <Section title="예약 마감" action={<span className="t-caption-13 text-tertiary">방문 시각 기준</span>}>
        <ChipGroup label="예약 마감">
          {DEADLINE_OPTIONS.map((m) => (
            <Chip key={m} selected={policy.bookingDeadlineMinutes === m} onClick={() => set({ bookingDeadlineMinutes: m })}>
              {m === 0 ? '직전까지' : `${minutesLabel(m)} 전`}
            </Chip>
          ))}
        </ChipGroup>
      </Section>

      <Divider thick />
      <Section title="예약금" action={<span className="t-caption-13 text-tertiary">P2 · 설정 API 준비 중</span>}>
        <p className="t-body-14 text-secondary">
          {store?.depositAmount ? `1인당 ${formatPrice(store.depositAmount)}` : '예약금 없이 예약받고 있어요'}
        </p>
      </Section>
      <div className={styles.spacer} />
    </Page>
  )
}
