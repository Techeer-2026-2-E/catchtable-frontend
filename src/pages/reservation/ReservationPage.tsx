import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Armchair, CreditCard, DoorClosed, Wine } from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import { TABLE_TYPE_LABEL, type ReservationHold, type TableType } from '@/entities'
import { useAuthStore } from '@/features/auth'
import { paymentApi } from '@/features/payment'
import { reservationApi, ReservationDateTimeForm, useReservationForm, useReservationFormStore } from '@/features/reservation'
import { useStoreDetail, useStoreMenus } from '@/features/store-detail'
import { isFeatureAvailable, paths } from '@/shared/config'
import { getErrorMessage } from '@/shared/lib'
import { dayjs, toStoreDateTime } from '@/shared/lib/dayjs'
import { formatPhone, formatPrice, formatTime } from '@/shared/lib/format'
import {
  Banner,
  BottomSheet,
  Button,
  Chip,
  ChipGroup,
  Divider,
  ErrorState,
  LoadingState,
  Page,
  Section,
  Textarea,
  toast,
  TopBar,
} from '@/shared/ui'
import styles from './ReservationPage.module.css'

type Step = 'datetime' | 'table' | 'confirm'
const STEPS: Step[] = ['datetime', 'table', 'confirm']
const TABLE_TYPES: TableType[] = ['ROOM', 'HALL', 'BAR']
const TABLE_ICON: Record<TableType, ReactNode> = {
  ROOM: <DoorClosed aria-hidden />,
  HALL: <Armchair aria-hidden />,
  BAR: <Wine aria-hidden />,
}
const PURPOSES = ['데이트', '친목', '가족식사', '생일', '기념일', '비즈니스', '기타']

/** 예약 — 날짜·인원·시간 → 테이블 타입·메뉴 → 확인 후 생성 (POST /api/user/reservations) */
export function ReservationPage() {
  const { storeId } = useParams<{ storeId: string }>()
  const id = Number(storeId)
  const navigate = useNavigate()
  const member = useAuthStore((s) => s.member)
  const { data: store, isPending, isError, refetch } = useStoreDetail(id)
  const menus = useStoreMenus(id)
  const form = useReservationFormStore()
  const setStore = useReservationFormStore((s) => s.setStore)
  const reservation = useReservationForm()
  const [step, setStep] = useState<Step>(() => (form.date && form.time ? 'table' : 'datetime'))

  useEffect(() => {
    setStore(id)
  }, [id, setStore])

  // 예약금 결제(prepare·confirm)는 백엔드 미구현 → 실제 연동에서는 결제 없이 바로 예약 생성
  const depositPerPerson = isFeatureAvailable('depositPayment') ? (store?.depositAmount ?? 0) : 0
  const deposit = useDeposit(depositPerPerson > 0 && step === 'confirm', id)

  if (isPending) {
    return (
      <Page>
        <TopBar leading="close" />
        <LoadingState />
      </Page>
    )
  }
  if (isError) {
    return (
      <Page>
        <TopBar leading="close" />
        <ErrorState onRetry={() => refetch()} />
      </Page>
    )
  }

  const menu = menus.data?.find((m) => m.id === form.menuId)
  const depositTotal = depositPerPerson * form.partySize
  const stepIndex = STEPS.indexOf(step)
  const canNext = (step === 'datetime' && !!form.date && !!form.time) || (step === 'table' && !!form.tableType)
  const openDays = store.businessHours.map((h) => h.dayOfWeek)

  const finish = (reservationId: number) => {
    form.reset()
    toast('예약이 확정됐어요')
    navigate(paths.reservationDetail(reservationId), { replace: true, state: { justCreated: true } })
  }

  const submit = async () => {
    if (depositPerPerson > 0) return deposit.openPayment()
    try {
      const created = await reservation.submit()
      finish(created.reservationId)
    } catch (e) {
      toast(getErrorMessage(e, '예약하지 못했어요. 다시 시도해주세요'))
    }
  }

  const summary =
    form.date && form.time ? `${dayjs(form.date).format('M월 D일 (dd)')} · ${formatTime(form.time)} · ${form.partySize}명` : ''

  return (
    <Page
      bottom={
        step === 'confirm' ? (
          <div className={styles.confirmBar}>
            <div className={styles.confirmSummary}>
              <span className="t-caption-13 text-secondary">{summary}</span>
              {depositPerPerson > 0 && <span className="t-headline-16">예약금 {formatPrice(depositTotal)}</span>}
            </div>
            <Button fullWidth onClick={submit} disabled={reservation.isPending || (depositPerPerson > 0 && !deposit.hold)}>
              {reservation.isPending ? '예약 중…' : depositPerPerson > 0 ? `${formatPrice(depositTotal)} 결제하고 예약` : '예약하기'}
            </Button>
          </div>
        ) : (
          <>
            {step === 'table' && (
              <Button variant="soft" className={styles.half} onClick={() => setStep('datetime')}>
                이전
              </Button>
            )}
            <Button className={styles.half} disabled={!canNext} onClick={() => setStep(STEPS[stepIndex + 1])}>
              다음
            </Button>
          </>
        )
      }
    >
      <TopBar
        title={store.name}
        leading={step === 'confirm' ? 'back' : 'close'}
        onLeadingClick={
          step === 'confirm'
            ? () => {
                deposit.release()
                setStep('table')
              }
            : () => navigate(-1)
        }
      />
      <div className={styles.progress} role="progressbar" aria-valuemin={1} aria-valuemax={3} aria-valuenow={stepIndex + 1}>
        <span style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }} />
      </div>

      {step === 'datetime' && (
        <Section title="언제 방문하시나요?">
          <ReservationDateTimeForm storeId={store.id} maxPartySize={store.maxPartySize} openDays={openDays} />
        </Section>
      )}

      {step === 'table' && (
        <>
          <Section title="테이블 타입 선택">
            <div className={styles.tableTypes} role="radiogroup" aria-label="테이블 타입">
              {TABLE_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  role="radio"
                  aria-checked={form.tableType === type}
                  className={styles.optionCard}
                  onClick={() => form.setTableType(type)}
                >
                  {TABLE_ICON[type]}
                  <span className="t-label-15">{TABLE_TYPE_LABEL[type]}</span>
                </button>
              ))}
            </div>
            <p className="t-caption-12 text-tertiary">
              * 실제 테이블은 매장 사정에 따라 시스템이 자동으로 배정해요. 선택한 타입이 없으면 다른 타입으로 배정될 수 있어요.
            </p>
          </Section>
          <Divider thick />
          <Section title="메뉴 선택" action={<span className="t-caption-13 text-tertiary">선택</span>}>
            {menus.isPending && <LoadingState compact />}
            <div className={styles.menus} role="radiogroup" aria-label="메뉴">
              {menus.data?.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={form.menuId === m.id}
                  disabled={m.soldOut}
                  className={`${styles.optionCard} ${styles.menuCard}`}
                  onClick={() => form.setMenu(form.menuId === m.id ? null : m.id)}
                >
                  <span className="t-body-15">
                    {m.name}
                    {m.soldOut && <span className="text-tertiary"> · 품절</span>}
                  </span>
                  <span className="t-caption-13 text-tertiary">1인 {formatPrice(m.price)}</span>
                  {m.description && <span className="t-caption-12 text-tertiary">{m.description}</span>}
                </button>
              ))}
            </div>
          </Section>
        </>
      )}

      {step === 'confirm' && (
        <>
          {depositPerPerson > 0 && <HoldBanner hold={deposit.hold} error={deposit.error} onRetry={deposit.retry} />}
          <Section
            title="예약 정보"
            action={
              <Button
                variant="ghost"
                size="S"
                onClick={() => {
                  deposit.release()
                  setStep('datetime')
                }}
              >
                변경
              </Button>
            }
          >
            <dl className={styles.infoTable}>
              <dt>일시</dt>
              <dd>{summary}</dd>
              <dt>테이블</dt>
              <dd>{form.tableType ? TABLE_TYPE_LABEL[form.tableType] : '-'} (자동 배정)</dd>
              <dt>메뉴</dt>
              <dd>{menu ? `${menu.name} · 1인 ${formatPrice(menu.price)}` : '현장에서 선택'}</dd>
              <dt>예약자</dt>
              <dd>{member ? `${member.name} · ${formatPhone(member.phone)}` : '-'}</dd>
            </dl>
          </Section>
          <Divider thick />
          <Section title="방문 목적" action={<span className="t-caption-13 text-tertiary">복수 선택</span>}>
            <ChipGroup label="방문 목적">
              {PURPOSES.map((p) => (
                <Chip key={p} selected={form.purposes.includes(p)} onClick={() => form.togglePurpose(p)}>
                  {p}
                </Chip>
              ))}
            </ChipGroup>
          </Section>
          <Section title="요청사항">
            <Textarea
              value={form.request}
              onChange={(e) => form.setRequest(e.target.value)}
              placeholder="알레르기, 유아 동반 등 매장에 전달할 내용을 적어주세요"
              maxLength={200}
            />
          </Section>
          <Section>
            <Banner tone="info">
              {depositPerPerson > 0
                ? '예약금은 방문 1일 전까지 취소하면 전액, 당일 취소는 50% 환불돼요.'
                : '방문 당일 취소나 노쇼는 이후 예약이 제한될 수 있어요.'}
            </Banner>
          </Section>
          <div className={styles.bottomSpacer} />
        </>
      )}

      <TestPaymentSheet
        isOpen={deposit.paying}
        amount={depositTotal}
        orderName={`${store.name} 예약금 (${form.partySize}명)`}
        onClose={deposit.closePayment}
        onPay={() => deposit.pay().then((reservationId) => reservationId && finish(reservationId))}
        isPending={deposit.isPaying}
      />
    </Page>
  )
}

/**
 * P2 예약금 — 확인 단계에 들어오면 테이블을 5분 선점하고, 결제가 끝나면 예약 확정
 * 선점(POST /reservations/holds) → 주문 생성(POST /payments/prepare) → 결제창 → 승인(POST /payments/confirm)
 */
function useDeposit(active: boolean, storeId: number) {
  const form = useReservationFormStore()
  const [hold, setHold] = useState<ReservationHold | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)
  const [isPaying, setIsPaying] = useState(false)
  const holdRef = useRef<ReservationHold | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!active || !form.date || !form.time) return
    let cancelled = false
    reservationApi
      .createHold({
        storeId,
        reservationStartAt: toStoreDateTime(form.date, form.time),
        partySize: form.partySize,
      })
      .then((h) => {
        if (cancelled) return reservationApi.releaseHold(h.holdId)
        holdRef.current = h
        setHold(h)
        setError(null)
      })
      .catch((e) => !cancelled && setError(getErrorMessage(e, '테이블을 선점하지 못했어요')))
    return () => {
      cancelled = true
    }
  }, [active, storeId, form.date, form.time, form.partySize, attempt])

  // 화면을 떠나면 선점 해제
  useEffect(
    () => () => {
      if (holdRef.current?.status === 'PENDING_PAYMENT') reservationApi.releaseHold(holdRef.current.holdId).catch(() => {})
    },
    [],
  )

  const release = () => {
    if (holdRef.current) reservationApi.releaseHold(holdRef.current.holdId).catch(() => {})
    holdRef.current = null
    setHold(null)
  }

  const pay = async () => {
    if (!holdRef.current) return null
    setIsPaying(true)
    try {
      const order = await paymentApi.prepare(holdRef.current.holdId)
      // TODO(토스페이먼츠 연동): 결제창에서 받은 paymentKey 로 승인 요청
      const result = await paymentApi.confirm({
        paymentKey: `test_${Date.now()}`,
        orderId: order.orderId,
        amount: order.amount,
      })
      holdRef.current = null
      setPaying(false)
      return result.reservationId
    } catch (e) {
      toast(getErrorMessage(e, '결제하지 못했어요'))
      return null
    } finally {
      setIsPaying(false)
    }
  }

  return {
    hold,
    error,
    retry: () => setAttempt((n) => n + 1),
    release,
    paying,
    isPaying,
    openPayment: () => setPaying(true),
    closePayment: () => setPaying(false),
    pay,
  }
}

/** 선점 남은 시간 — 서버 만료 시각 기준 */
function HoldBanner({ hold, error, onRetry }: { hold: ReservationHold | null; error: string | null; onRetry: () => void }) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const timer = window.setInterval(() => setTick((n) => n + 1), 1000)
    return () => window.clearInterval(timer)
  }, [])

  if (error) {
    return (
      <div className={styles.hold} role="alert">
        <span>{error}</span>
        <Button variant="ghost" size="S" onClick={onRetry}>
          다시 시도
        </Button>
      </div>
    )
  }
  if (!hold) return <div className={styles.hold}>테이블을 선점하는 중…</div>

  const left = Math.max(0, dayjs(hold.expiresAt).diff(dayjs(), 'second'))
  const mm = String(Math.floor(left / 60)).padStart(2, '0')
  const ss = String(left % 60).padStart(2, '0')
  return (
    <div className={styles.hold} role="timer">
      <strong className="text-accent">
        {mm}:{ss}
      </strong>
      <span>
        {left > 0 ? '5분간 테이블이 임시로 선점돼요. 시간 내 결제를 완료해주세요.' : '선점 시간이 지났어요. 일시를 다시 골라주세요.'}
      </span>
    </div>
  )
}

/**
 * 테스트 결제창 — 실제 토스페이먼츠 결제위젯 자리
 * TODO(토스페이먼츠 연동): 결제위젯 SDK 로 교체
 */
function TestPaymentSheet({
  isOpen,
  amount,
  orderName,
  onClose,
  onPay,
  isPending,
}: {
  isOpen: boolean
  amount: number
  orderName: string
  onClose: () => void
  onPay: () => void
  isPending: boolean
}) {
  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="예약금 결제"
      footer={
        <Button onClick={onPay} disabled={isPending}>
          {isPending ? '결제 중…' : `${formatPrice(amount)} 결제하기`}
        </Button>
      }
    >
      <div className={styles.payment}>
        <Banner tone="notice">테스트 결제예요. 실제로 돈이 나가지 않아요.</Banner>
        <dl className={styles.infoTable}>
          <dt>주문</dt>
          <dd>{orderName}</dd>
          <dt>금액</dt>
          <dd>{formatPrice(amount)}</dd>
        </dl>
        <div className={styles.payMethod}>
          <CreditCard aria-hidden />
          <span className="t-body-15">신용·체크카드</span>
        </div>
      </div>
    </BottomSheet>
  )
}
