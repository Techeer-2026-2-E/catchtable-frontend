import { useEffect, useState, type ReactNode } from 'react'
import { Armchair, DoorClosed, Wine } from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import { TABLE_TYPE_LABEL, type TableType } from '@/entities'
import { findMockStore, MOCK_BUSINESS_HOURS, MOCK_MEMBER, MOCK_MENUS, MOCK_TABLES } from '@/entities/mock'
import { ReservationDateTimeForm, useReservationFormStore } from '@/features/reservation'
import { paths } from '@/shared/config'
import { dayjs } from '@/shared/lib/dayjs'
import { formatPhone, formatPrice, formatTime } from '@/shared/lib/format'
import { Banner, Button, Chip, ChipGroup, Divider, Page, Section, Textarea, toast, TopBar } from '@/shared/ui'
import styles from './ReservationPage.module.css'

type Step = 'datetime' | 'table' | 'confirm'
const STEPS: Step[] = ['datetime', 'table', 'confirm']
const TABLE_ICON: Record<TableType, ReactNode> = {
  ROOM: <DoorClosed aria-hidden />,
  HALL: <Armchair aria-hidden />,
  BAR: <Wine aria-hidden />,
}
const PURPOSES = ['데이트', '친목', '가족식사', '생일', '기념일', '비즈니스', '기타']
const HOLD_SECONDS = 5 * 60

export function ReservationPage() {
  const { storeId } = useParams<{ storeId: string }>()
  const navigate = useNavigate()
  // TODO(API 연동): useStoreDetail, useStoreMenus
  const store = findMockStore(storeId)
  const form = useReservationFormStore()
  const setStore = useReservationFormStore((s) => s.setStore)
  const [step, setStep] = useState<Step>(() => (form.date && form.time ? 'table' : 'datetime'))

  useEffect(() => {
    setStore(store.id)
  }, [store.id, setStore])

  const tableTypes = [...new Set(MOCK_TABLES.map((t) => t.tableType).filter(Boolean))] as TableType[]
  const menu = MOCK_MENUS.find((m) => m.id === form.menuId)
  const deposit = (store.depositAmount ?? 0) * form.partySize
  const stepIndex = STEPS.indexOf(step)

  const canNext =
    (step === 'datetime' && !!form.date && !!form.time) || (step === 'table' && !!form.tableType)

  const submit = () => {
    // TODO(API 연동): useReservationForm().submit — 서버가 테이블을 자동 배정하고 즉시 확정해서 응답
    const table = assignTable(form.tableType, form.partySize)
    if (!table) {
      toast('선택한 조건에 맞는 빈 테이블이 없어요. 다른 시간이나 좌석을 골라주세요')
      return
    }
    form.reset()
    toast('예약이 확정됐어요')
    navigate(paths.reservationDetail(101), {
      replace: true,
      state: { justCreated: true, tableNumber: table.tableNumber, tableTypeLabel: TABLE_TYPE_LABEL[table.tableType ?? 'HALL'] },
    })
  }

  const summary = form.date && form.time
    ? `${dayjs(form.date).format('M월 D일 (dd)')} · ${formatTime(form.time)} · ${form.partySize}명`
    : ''

  return (
    <Page
      bottom={
        step === 'confirm' ? (
          <div className={styles.confirmBar}>
            <div className={styles.confirmSummary}>
              <span className="t-caption-13 text-secondary">{summary}</span>
              <span className="t-headline-16">예약금 {formatPrice(deposit)}</span>
            </div>
            <Button fullWidth onClick={submit}>
              예약하기
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
        onLeadingClick={step === 'confirm' ? () => setStep('table') : () => navigate(-1)}
      />
      <div className={styles.progress} role="progressbar" aria-valuemin={1} aria-valuemax={3} aria-valuenow={stepIndex + 1}>
        <span style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }} />
      </div>

      {step === 'datetime' && (
        <Section title="언제 방문하시나요?">
          <ReservationDateTimeForm
            maxPartySize={store.maxPartySize}
            closedDays={MOCK_BUSINESS_HOURS.filter((h) => h.closed).map((h) => h.dayOfWeek)}
          />
        </Section>
      )}

      {step === 'table' && (
        <>
          <Section title="테이블 타입 선택">
            <div className={styles.tableTypes} role="radiogroup" aria-label="테이블 타입">
              {tableTypes.map((type) => (
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
            <p className="t-caption-12 text-tertiary">* 실제 테이블은 매장 사정에 따라 시스템이 자동으로 배정해요.</p>
          </Section>
          <Divider thick />
          <Section title="메뉴 선택" action={<span className="t-caption-13 text-tertiary">선택</span>}>
            <div className={styles.menus} role="radiogroup" aria-label="메뉴">
              {MOCK_MENUS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={form.menuId === m.id}
                  className={`${styles.optionCard} ${styles.menuCard}`}
                  onClick={() => form.setMenu(form.menuId === m.id ? null : m.id)}
                >
                  <span className="t-body-15">{m.name}</span>
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
          {deposit > 0 && <HoldBanner />}
          <Section
            title="예약 정보"
            action={
              <Button variant="ghost" size="S" onClick={() => setStep('datetime')}>
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
              <dd>
                {MOCK_MEMBER.name} · {formatPhone(MOCK_MEMBER.phone)}
              </dd>
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
              방문 당일 취소나 노쇼는 이후 예약이 제한될 수 있어요.
            </Banner>
          </Section>
          <div className={styles.bottomSpacer} />
        </>
      )}
    </Page>
  )
}

/**
 * 기능명세「물리 테이블 자동 배정」 — 목데이터용 배정 규칙 (실제 배정은 백엔드)
 * 선택한 좌석 타입 중 인원이 수용 범위에 들고, 남는 자리가 가장 적은 테이블
 */
function assignTable(tableType: TableType | null, partySize: number) {
  return MOCK_TABLES.filter(
    (t) =>
      t.status === 'ACTIVE' &&
      (!tableType || t.tableType === tableType) &&
      (t.minCapacity ?? 1) <= partySize &&
      t.capacity >= partySize,
  ).sort((a, b) => a.capacity - b.capacity)[0]
}

/** P2: 예약금 결제 중 테이블 5분 임시 선점 안내 */
function HoldBanner() {
  const [left, setLeft] = useState(HOLD_SECONDS)
  useEffect(() => {
    const timer = window.setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [])
  const mm = String(Math.floor(left / 60)).padStart(2, '0')
  const ss = String(left % 60).padStart(2, '0')

  return (
    <div className={styles.hold} role="timer">
      <strong className="text-accent">
        {mm}:{ss}
      </strong>
      <span>5분간 테이블이 임시로 선점돼요. 시간 내 예약을 완료해주세요.</span>
    </div>
  )
}
