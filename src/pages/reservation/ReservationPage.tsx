import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useAuthStore } from '@/features/auth'
import { ReservationDateTimeForm, useReservationForm, useReservationFormStore } from '@/features/reservation'
import { useStoreDetail } from '@/features/store-detail'
import { paths } from '@/shared/config'
import { getErrorMessage } from '@/shared/lib'
import { dayjs } from '@/shared/lib/dayjs'
import { formatPhone, formatTime } from '@/shared/lib/format'
import { Button, ErrorState, LoadingState, Page, Section, toast, TopBar } from '@/shared/ui'
import styles from './ReservationPage.module.css'

type Step = 'datetime' | 'confirm'
const STEPS: Step[] = ['datetime', 'confirm']

/**
 * 예약 — 날짜·인원·시간 선택 → 확인 후 생성
 * POST /api/user/reservations { storeId, reservationStartAt, partySize } — 테이블은 서버가 자동 배정
 */
export function ReservationPage() {
  const { storeId } = useParams<{ storeId: string }>()
  const id = Number(storeId)
  const navigate = useNavigate()
  const member = useAuthStore((s) => s.member)
  const { data: store, isPending, isError, refetch } = useStoreDetail(id)
  const form = useReservationFormStore()
  const setStore = useReservationFormStore((s) => s.setStore)
  const reservation = useReservationForm()
  const [step, setStep] = useState<Step>(() => (form.date && form.time ? 'confirm' : 'datetime'))

  useEffect(() => {
    setStore(id)
  }, [id, setStore])

  if (isPending || isError) {
    return (
      <Page>
        <TopBar leading="close" />
        {isPending ? <LoadingState /> : <ErrorState onRetry={() => refetch()} />}
      </Page>
    )
  }

  const stepIndex = STEPS.indexOf(step)
  const openDays = store.businessHours.map((h) => h.dayOfWeek)
  const summary =
    form.date && form.time ? `${dayjs(form.date).format('M월 D일 (dd)')} · ${formatTime(form.time)} · ${form.partySize}명` : ''

  const submit = async () => {
    try {
      const created = await reservation.submit()
      form.reset()
      toast('예약이 확정됐어요')
      navigate(paths.reservationDetail(created.reservationId), { replace: true, state: { justCreated: true } })
    } catch (e) {
      toast(getErrorMessage(e, '예약하지 못했어요. 다시 시도해주세요'))
    }
  }

  return (
    <Page
      bottom={
        step === 'confirm' ? (
          <Button fullWidth onClick={submit} disabled={reservation.isPending}>
            {reservation.isPending ? '예약 중…' : '예약하기'}
          </Button>
        ) : (
          <Button fullWidth disabled={!form.date || !form.time} onClick={() => setStep('confirm')}>
            다음
          </Button>
        )
      }
    >
      <TopBar
        title={store.name}
        leading={step === 'confirm' ? 'back' : 'close'}
        onLeadingClick={step === 'confirm' ? () => setStep('datetime') : () => navigate(-1)}
      />
      <div className={styles.progress} role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={stepIndex + 1}>
        <span style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }} />
      </div>

      {step === 'datetime' && (
        <Section title="언제 방문하시나요?">
          <ReservationDateTimeForm storeId={store.id} openDays={openDays} />
        </Section>
      )}

      {step === 'confirm' && (
        <Section
          title="예약 정보"
          action={
            <Button variant="ghost" size="S" onClick={() => setStep('datetime')}>
              변경
            </Button>
          }
        >
          <dl className={styles.infoTable}>
            <dt>매장</dt>
            <dd>{store.name}</dd>
            <dt>일시</dt>
            <dd>{summary}</dd>
            <dt>예약자</dt>
            <dd>{member ? `${member.name} · ${formatPhone(member.phone)}` : '-'}</dd>
          </dl>
        </Section>
      )}
    </Page>
  )
}
