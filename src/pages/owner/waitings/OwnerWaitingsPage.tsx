import { useEffect, useState } from 'react'
import { UsersRound } from 'lucide-react'
import { useParams } from 'react-router'
import { ACTIVE_WAITING_STATUSES, WAITING_STATUS_LABEL, WAITING_STATUS_TONE, type OwnerWaiting } from '@/entities'
import {
  useOwnerWaitingActions,
  useOwnerWaitings,
  useWaitingSettings,
  useWaitingSettingsMutations,
} from '@/features/owner-waiting'
import { getErrorMessage } from '@/shared/lib'
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
  ErrorState,
  LoadingState,
  Page,
  toast,
  Toggle,
  TopBar,
} from '@/shared/ui'
import styles from './OwnerWaitingsPage.module.css'

const ARRIVAL_OPTIONS = [5, 10, 15]
type Pending = { type: 'noShow' | 'cancel'; waiting: OwnerWaiting } | null

/**
 * 기능명세「웨이팅 접수 시작·종료」「현재 대기 고객 목록」「웨이팅 고객 호출」「웨이팅 착석 처리」
 * 「웨이팅 미응답·노쇼 처리」「점주 웨이팅 취소」「호출 도착 제한시간 설정」「순번 미루기」「호출 재전송(P2)」
 * GET /api/owner/stores/{storeId}/waitings (10초마다 갱신) · POST /api/owner/waitings/{id}/{call|recall|enter|no-show|defer}
 */
export function OwnerWaitingsPage() {
  const { storeId } = useParams<{ storeId: string }>()
  const id = Number(storeId)
  const waitings = useOwnerWaitings(id)
  const settings = useWaitingSettings(id)
  const settingMutations = useWaitingSettingsMutations(id)
  const actions = useOwnerWaitingActions(id)
  const [pending, setPending] = useState<Pending>(null)
  const [settingOpen, setSettingOpen] = useState(false)

  const open = settings.data?.open ?? false
  const arrivalLimit = settings.data?.arrivalLimitMinutes ?? 10
  const active = (waitings.data ?? [])
    .filter((w) => ACTIVE_WAITING_STATUSES.includes(w.status))
    .sort((a, b) => a.waitNumber - b.waitNumber)
  const onError = (e: unknown) => toast(getErrorMessage(e, '처리하지 못했어요'))
  const run = (mutation: { mutate: (id: number, o: object) => void }, w: OwnerWaiting, message: string) =>
    mutation.mutate(w.waitingId, { onSuccess: () => toast(message), onError })

  const toggleOpen = (v: boolean) =>
    (v ? settingMutations.open : settingMutations.close).mutate(undefined, {
      onSuccess: () => toast(v ? '웨이팅 접수를 시작했어요' : '웨이팅 접수를 마감했어요'),
      onError,
    })

  return (
    <Page>
      <TopBar title="웨이팅 현황 관리" />

      <div className={styles.control}>
        <div>
          <p className="t-headline-16">{open ? '웨이팅 접수 중' : '웨이팅 접수 마감'}</p>
          <button type="button" className="t-caption-13 text-tertiary" onClick={() => setSettingOpen(true)}>
            호출 후 도착 제한시간 {arrivalLimit}분{settings.data?.autoCall && ' · 자동 호출'} · <u>변경</u>
          </button>
        </div>
        <Toggle
          checked={open}
          label="웨이팅 접수"
          disabled={settings.isPending || settingMutations.open.isPending || settingMutations.close.isPending}
          onChange={toggleOpen}
        />
      </div>

      <div className={styles.summary}>
        <span className="t-body-14">
          현재 대기 <strong>{active.length}팀</strong> · {active.reduce((s, w) => s + w.partyCount, 0)}명
        </span>
      </div>
      <div className={styles.banner}>
        <Banner tone="info">공석이 생기면 다음 대기 고객을 호출해주세요. 호출 알림은 고객에게 바로 전송돼요.</Banner>
      </div>

      {waitings.isPending ? (
        <LoadingState />
      ) : waitings.isError ? (
        <ErrorState onRetry={() => waitings.refetch()} />
      ) : active.length === 0 ? (
        <EmptyState icon={<UsersRound />} title="대기 중인 고객이 없어요" />
      ) : (
        <ul className={styles.list}>
          {active.map((w, index) => {
            const called = w.status === 'CALLED' || w.status === 'CONFIRMED'
            const isLast = index === active.length - 1
            return (
              <Card as="li" key={w.waitingId} className={styles.card}>
                <div className={styles.head}>
                  <p className="t-headline-16">
                    {w.waitNumber}번 · {w.customerName} · {w.partyCount}명
                  </p>
                  <Badge tone={WAITING_STATUS_TONE[w.status]} solid={w.status === 'CALLED'}>
                    {WAITING_STATUS_LABEL[w.status]}
                  </Badge>
                </div>
                <p className="t-caption-13 text-tertiary">
                  {w.createdAt && `접수 ${dayjs(w.createdAt).format('HH:mm')}`}
                  {w.seatPreference && ` · ${w.seatPreference}`}
                  {called && w.calledAt && ` · 호출 ${dayjs(w.calledAt).format('HH:mm')}`}
                  {!!w.recallCount && ` (재호출 ${w.recallCount}회)`}
                  {called && w.callExpiresAt && <ArrivalCountdown expiresAt={w.callExpiresAt} />}
                </p>
                <div className={styles.actions}>
                  {called ? (
                    <>
                      <Button
                        size="S"
                        variant="secondary"
                        disabled={actions.enter.isPending}
                        onClick={() => run(actions.enter, w, `${w.waitNumber}번 고객을 착석 처리했어요`)}
                      >
                        착석 처리
                      </Button>
                      {w.status === 'CALLED' && (
                        <Button
                          size="S"
                          variant="soft"
                          disabled={actions.recall.isPending}
                          onClick={() => run(actions.recall, w, '호출을 다시 보냈어요')}
                        >
                          호출 재전송
                        </Button>
                      )}
                      <Button size="S" variant="ghost" onClick={() => setPending({ type: 'noShow', waiting: w })}>
                        미응답 노쇼
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="S"
                        variant="secondary"
                        disabled={actions.call.isPending}
                        onClick={() => run(actions.call, w, `${w.waitNumber}번 고객을 호출했어요`)}
                      >
                        호출
                      </Button>
                      {!isLast && (
                        <Button
                          size="S"
                          variant="soft"
                          disabled={actions.defer.isPending}
                          onClick={() => run(actions.defer, w, `${w.waitNumber}번 순서를 한 칸 미뤘어요`)}
                        >
                          순서 미루기
                        </Button>
                      )}
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
          const mutation = type === 'noShow' ? actions.noShow : actions.cancel
          mutation.mutate(w.waitingId, {
            onSuccess: () => {
              toast(type === 'noShow' ? `${w.waitNumber}번을 노쇼로 처리했어요` : `${w.waitNumber}번 웨이팅을 취소했어요`)
              setPending(null)
            },
            onError,
          })
        }}
      >
        {pending && `${pending.waiting.waitNumber}번 · ${pending.waiting.customerName}님 · ${pending.waiting.partyCount}명`}
        <br />
        고객에게 알림이 전송되고 순번이 목록에서 사라져요.
      </Dialog>

      <BottomSheet isOpen={settingOpen} onClose={() => setSettingOpen(false)} title="웨이팅 운영 설정">
        <p className="t-body-14 text-secondary">호출 후 이 시간 안에 응답·도착하지 않으면 순번이 만료돼요.</p>
        <ChipGroup label="도착 제한시간" className={styles.sheetChips}>
          {ARRIVAL_OPTIONS.map((m) => (
            <Chip
              key={m}
              selected={arrivalLimit === m}
              onClick={() =>
                settingMutations.update.mutate(
                  { arrivalLimitMinutes: m },
                  { onSuccess: () => toast(`도착 제한시간을 ${m}분으로 바꿨어요`), onError },
                )
              }
            >
              {m}분
            </Chip>
          ))}
        </ChipGroup>
        <div className={styles.autoCall}>
          <div>
            <p className="t-body-15">착석 처리 후 다음 고객 자동 호출</p>
            <p className="t-caption-13 text-tertiary">공석이 생기면 대기 1번 고객에게 바로 호출 알림을 보내요</p>
          </div>
          <Toggle
            checked={settings.data?.autoCall ?? false}
            label="다음 고객 자동 호출"
            onChange={(autoCall) => settingMutations.update.mutate({ autoCall }, { onError })}
          />
        </div>
      </BottomSheet>
    </Page>
  )
}

/** 호출 응답 제한 시각까지 남은 시간 — 1초마다 이 컴포넌트만 다시 그림 */
function ArrivalCountdown({ expiresAt }: { expiresAt: string }) {
  const [now, setNow] = useState(() => dayjs())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(dayjs()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const leftSec = dayjs(expiresAt).diff(now, 'second')
  if (leftSec <= 0) return <span className="text-danger"> · 도착 제한시간 초과</span>
  return (
    <span className="text-accent" role="timer">
      {' '}
      · {Math.floor(leftSec / 60)}분 {String(leftSec % 60).padStart(2, '0')}초 남음
    </span>
  )
}
