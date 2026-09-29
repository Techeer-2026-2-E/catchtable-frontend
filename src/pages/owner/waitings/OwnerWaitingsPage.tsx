import { useEffect, useState } from 'react'
import { UsersRound } from 'lucide-react'
import { WAITING_STATUS_LABEL, WAITING_STATUS_TONE, type Waiting, type WaitingStatus } from '@/entities'
import { MOCK_OWNER_WAITINGS } from '@/entities/mock'
import { dayjs } from '@/shared/lib/dayjs'
import {
  Badge,
  Banner,
  BottomSheet,
  Button,
  Card,
  Chip,
  ChipGroup,
  Dialog,
  EmptyState,
  Page,
  toast,
  Toggle,
  TopBar,
} from '@/shared/ui'
import styles from './OwnerWaitingsPage.module.css'

const ARRIVAL_OPTIONS = [5, 10, 15]
type Pending = { type: 'noShow' | 'cancel'; waiting: Waiting } | null

/**
 * 기능명세「웨이팅 접수 시작·종료」「현재 대기 고객 목록」「웨이팅 고객 호출」「웨이팅 착석 처리」
 * 「웨이팅 미응답·노쇼 처리」「점주 웨이팅 취소」「호출 도착 제한시간 설정」
 */
export function OwnerWaitingsPage() {
  // TODO(API 연동): useOwnerWaitings(storeId), useOwnerWaitingActions — 목록은 SSE 로 실시간 갱신 예정
  const [open, setOpen] = useState(true)
  const [arrivalLimit, setArrivalLimit] = useState(10)
  const [waitings, setWaitings] = useState(MOCK_OWNER_WAITINGS)
  const [pending, setPending] = useState<Pending>(null)
  const [settingOpen, setSettingOpen] = useState(false)
  const now = useNow()

  const active = waitings.filter((w) => w.status === 'WAITING' || w.status === 'CALLED')
  const update = (id: number, patch: Partial<Waiting>, message: string) => {
    setWaitings((list) => list.map((w) => (w.id === id ? { ...w, ...patch } : w)))
    toast(message)
  }
  const setStatus = (w: Waiting, status: WaitingStatus, message: string) => update(w.id, { status }, message)

  return (
    <Page>
      <TopBar title="웨이팅 현황 관리" />

      <div className={styles.control}>
        <div>
          <p className="t-headline-16">{open ? '웨이팅 접수 중' : '웨이팅 접수 마감'}</p>
          <button type="button" className="t-caption-13 text-tertiary" onClick={() => setSettingOpen(true)}>
            호출 후 도착 제한시간 {arrivalLimit}분 · <u>변경</u>
          </button>
        </div>
        <Toggle
          checked={open}
          label="웨이팅 접수"
          onChange={(v) => {
            setOpen(v)
            toast(v ? '웨이팅 접수를 시작했어요' : '웨이팅 접수를 마감했어요')
          }}
        />
      </div>

      <div className={styles.summary}>
        <span className="t-body-14">
          현재 대기 <strong>{active.length}팀</strong> · {active.reduce((s, w) => s + w.partySize, 0)}명
        </span>
      </div>
      <div className={styles.banner}>
        <Banner tone="info">공석이 생기면 다음 대기 고객을 호출해주세요. 호출 알림은 고객에게 바로 전송돼요.</Banner>
      </div>

      {active.length === 0 ? (
        <EmptyState icon={<UsersRound />} title="대기 중인 고객이 없어요" />
      ) : (
        <ul className={styles.list}>
          {active.map((w) => {
            const called = w.status === 'CALLED'
            const leftSec = called && w.calledAt ? arrivalLimit * 60 - now.diff(dayjs(w.calledAt), 'second') : 0
            const expired = called && leftSec <= 0
            return (
              <Card as="li" key={w.id} className={styles.card}>
                <div className={styles.head}>
                  <p className="t-headline-16">
                    {w.waitingNumber}번 · {w.customerName} · {w.partySize}명
                  </p>
                  <Badge tone={WAITING_STATUS_TONE[w.status]} solid={called}>
                    {WAITING_STATUS_LABEL[w.status]}
                  </Badge>
                </div>
                <p className="t-caption-13 text-tertiary">
                  접수 {dayjs(w.createdAt).format('HH:mm')}
                  {called && w.calledAt && ` · 호출 ${dayjs(w.calledAt).format('HH:mm')}`}
                  {called && !expired && (
                    <span className="text-accent">
                      {' '}
                      · {Math.floor(leftSec / 60)}분 {String(leftSec % 60).padStart(2, '0')}초 남음
                    </span>
                  )}
                  {expired && <span className="text-danger"> · 도착 제한시간 초과</span>}
                </p>
                <div className={styles.actions}>
                  {called ? (
                    <>
                      <Button size="S" variant="secondary" onClick={() => setStatus(w, 'SEATED', `${w.waitingNumber}번 고객을 착석 처리했어요`)}>
                        착석 처리
                      </Button>
                      {/* P2: 호출 재전송 */}
                      <Button size="S" variant="soft" onClick={() => update(w.id, { calledAt: dayjs().toISOString() }, '호출을 다시 보냈어요')}>
                        호출 재전송
                      </Button>
                      <Button size="S" variant="ghost" onClick={() => setPending({ type: 'noShow', waiting: w })}>
                        미응답 노쇼
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="S"
                        variant="secondary"
                        onClick={() => update(w.id, { status: 'CALLED', calledAt: dayjs().toISOString() }, `${w.waitingNumber}번 고객을 호출했어요`)}
                      >
                        호출
                      </Button>
                      <Button size="S" variant="ghost" onClick={() => setPending({ type: 'cancel', waiting: w })}>
                        웨이팅 취소
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            )
          })}
        </ul>
      )}

      <Dialog
        isOpen={!!pending}
        onClose={() => setPending(null)}
        title={pending?.type === 'noShow' ? '미응답 노쇼로 처리할까요?' : '웨이팅을 취소할까요?'}
        confirmLabel={pending?.type === 'noShow' ? '노쇼 처리' : '웨이팅 취소'}
        onConfirm={() => {
          if (!pending) return
          const { waiting: w, type } = pending
          if (type === 'noShow') setStatus(w, 'NO_SHOW', `${w.waitingNumber}번을 노쇼로 처리했어요`)
          else setStatus(w, 'CANCELED', `${w.waitingNumber}번 웨이팅을 취소했어요`)
          setPending(null)
        }}
      >
        {pending && `${pending.waiting.waitingNumber}번 · ${pending.waiting.customerName}님 · ${pending.waiting.partySize}명`}
        <br />
        고객에게 알림이 전송되고 순번이 목록에서 사라져요.
      </Dialog>

      <BottomSheet isOpen={settingOpen} onClose={() => setSettingOpen(false)} title="호출 도착 제한시간">
        <p className="t-body-14 text-secondary">호출 후 이 시간 안에 응답·도착하지 않으면 순번이 만료돼요.</p>
        <ChipGroup label="도착 제한시간" className={styles.sheetChips}>
          {ARRIVAL_OPTIONS.map((m) => (
            <Chip
              key={m}
              selected={arrivalLimit === m}
              onClick={() => {
                setArrivalLimit(m)
                setSettingOpen(false)
                toast(`도착 제한시간을 ${m}분으로 바꿨어요`)
              }}
            >
              {m}분
            </Chip>
          ))}
        </ChipGroup>
      </BottomSheet>
    </Page>
  )
}

/** 1초마다 현재 시각 갱신 — 호출 남은 시간 표시용 */
function useNow() {
  const [now, setNow] = useState(dayjs())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(dayjs()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  return now
}
