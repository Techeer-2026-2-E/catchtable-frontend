import { useEffect, useState } from 'react'
import { UsersRound } from 'lucide-react'
import { useParams } from 'react-router'
import { ACTIVE_WAITING_STATUSES, WAITING_STATUS_LABEL, WAITING_STATUS_TONE, type OwnerWaiting } from '@/entities'
import { useAuthStore } from '@/features/auth'
import {
  type OwnerWaitingNoShowRequest,
  useOwnerWaitingActions,
  useOwnerWaitingStream,
  useOwnerWaitings,
  useWaitingSettings,
  useWaitingSettingsMutations,
} from '@/features/owner-waiting'
import { getErrorMessage } from '@/shared/lib'
import { dayjs } from '@/shared/lib/dayjs'
import {
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
  StatLine,
  Textarea,
  toast,
  Toggle,
  TopBar,
} from '@/shared/ui'
import styles from './OwnerWaitingsPage.module.css'

const ARRIVAL_OPTIONS = [5, 10, 15]
type Pending = { type: 'noShow' | 'cancel'; waiting: OwnerWaiting } | null
type NoShowReason = OwnerWaitingNoShowRequest['reason']
const NO_SHOW_REASONS: { value: NoShowReason; label: string }[] = [
  { value: 'NO_RESPONSE', label: '호출 미응답' },
  { value: 'NO_SHOW', label: '미방문(노쇼)' },
]
const REASON_MAX = 300

/**
 * 기능명세「웨이팅 접수 시작·종료」「현재 대기 고객 목록」「웨이팅 고객 호출」「웨이팅 착석 처리」
 * 「웨이팅 미응답·노쇼 처리」「점주 웨이팅 취소」「호출 도착 제한시간 설정」
 * GET /api/owner/stores/{storeId}/waitings + 실시간 구독(SSE, WAITING_CHANGED) · POST /api/owner/waitings/{id}/{call|enter|no-show}
 * DELETE /api/owner/waitings/{id} (사유 필수)
 */
export function OwnerWaitingsPage() {
  const { storeId } = useParams<{ storeId: string }>()
  const id = Number(storeId)
  const waitings = useOwnerWaitings(id)
  const settings = useWaitingSettings(id)
  const settingMutations = useWaitingSettingsMutations(id)
  const actions = useOwnerWaitingActions(id)
  const memberId = useAuthStore((s) => s.member?.id ?? null)
  useOwnerWaitingStream(id, memberId)
  const [pending, setPending] = useState<Pending>(null)
  const [noShowReason, setNoShowReason] = useState<NoShowReason>('NO_RESPONSE')
  const [reasonText, setReasonText] = useState('')
  const [settingOpen, setSettingOpen] = useState(false)

  const open = settings.data?.open ?? false
  const arrivalLimit = settings.data?.arrivalLimitMinutes ?? 10
  const active = (waitings.data ?? [])
    .filter((w) => ACTIVE_WAITING_STATUSES.includes(w.status))
    .sort((a, b) => a.waitingNumber - b.waitingNumber)
  const onError = (e: unknown) => toast(getErrorMessage(e, '처리하지 못했어요'))
  const run = (mutation: { mutate: (id: number, o: object) => void }, w: OwnerWaiting, message: string) =>
    mutation.mutate(w.id, { onSuccess: () => toast(message), onError })

  const openPending = (type: 'noShow' | 'cancel', waiting: OwnerWaiting) => {
    setNoShowReason('NO_RESPONSE')
    setReasonText('')
    setPending({ type, waiting })
  }

  // 백엔드는 노쇼 상세 사유·취소 사유 모두 공백 불가
  const confirmPending = () => {
    if (!pending) return
    const reason = reasonText.trim()
    if (!reason) {
      toast('사유를 입력해주세요')
      return
    }
    const { waiting: w, type } = pending
    const onSuccess = () => {
      toast(type === 'noShow' ? `${w.waitingNumber}번을 노쇼로 처리했어요` : `${w.waitingNumber}번 웨이팅을 취소했어요`)
      setPending(null)
    }
    if (type === 'noShow') {
      actions.noShow.mutate({ waitingId: w.id, body: { reason: noShowReason, detail: reason } }, { onSuccess, onError })
    } else {
      actions.cancel.mutate({ waitingId: w.id, reason }, { onSuccess, onError })
    }
  }

  const toggleOpen = (v: boolean) =>
    (v ? settingMutations.open : settingMutations.close).mutate(undefined, {
      onSuccess: () => toast(v ? '웨이팅 접수를 시작했어요' : '웨이팅 접수를 마감했어요'),
      onError,
    })

  return (
    <Page>
      <TopBar title="웨이팅 현황 관리" />

      <div className={styles.control}>
        <p className="t-headline-16">{open ? '웨이팅 받는 중' : '웨이팅 마감'}</p>
        <Toggle
          checked={open}
          label="웨이팅 접수"
          disabled={settings.isPending || settingMutations.open.isPending || settingMutations.close.isPending}
          onChange={toggleOpen}
        />
      </div>
      <div className={styles.summary}>
        <StatLine
          items={[
            { label: '대기', value: active.length, unit: '팀' },
            { label: '인원', value: active.reduce((sum, w) => sum + w.partySize, 0), unit: '명' },
            { label: '도착 제한', value: arrivalLimit, unit: '분' },
          ]}
        />
        <button type="button" className={`${styles.setting} t-caption-13`} onClick={() => setSettingOpen(true)}>
          도착 제한시간 바꾸기
        </button>
      </div>

      {waitings.isPending ? (
        <LoadingState />
      ) : waitings.isError ? (
        <ErrorState onRetry={() => waitings.refetch()} />
      ) : active.length === 0 ? (
        <EmptyState icon={<UsersRound />} title="대기 중인 고객이 없어요" />
      ) : (
        <ul className={styles.list}>
          {active.map((w) => {
            const called = w.status === 'CALLED' || w.status === 'CONFIRMED'
            const responded = w.arrivalIntent === 'COMING' && !!w.respondedAt
            return (
              <Card as="li" key={w.id} className={styles.card}>
                <div className={styles.lead}>
                  <span className={`${styles.leadNumber} tnum`}>{w.waitingNumber}</span>
                  <span className="t-caption-12 text-tertiary">{w.partySize}명</span>
                </div>
                <div className={styles.body}>
                  <span className="status-text" data-tone={WAITING_STATUS_TONE[w.status]}>
                    {responded ? WAITING_STATUS_LABEL.CONFIRMED : WAITING_STATUS_LABEL[w.status]}
                    {called && w.callExpiresAt && <ArrivalCountdown expiresAt={w.callExpiresAt} />}
                  </span>
                  <p className="t-headline-16">{w.customerName}</p>
                  <p className="t-caption-13 text-tertiary tnum">
                    {w.createdAt && `${dayjs(w.createdAt).format('HH:mm')} 접수`}
                    {called && w.calledAt && `, ${dayjs(w.calledAt).format('HH:mm')} 호출`}
                    {called && responded && `, ${dayjs(w.respondedAt).format('HH:mm')} 응답`}
                  </p>
                  <div className={styles.actions}>
                    {called ? (
                      <>
                        <Button
                          size="S"
                          variant="secondary"
                          disabled={actions.enter.isPending}
                          onClick={() => run(actions.enter, w, `${w.waitingNumber}번 고객을 착석 처리했어요`)}
                        >
                          착석 처리
                        </Button>
                        <Button size="S" variant="ghost" onClick={() => openPending('noShow', w)}>
                          미응답 노쇼
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="S"
                          variant="secondary"
                          disabled={actions.call.isPending}
                          onClick={() => run(actions.call, w, `${w.waitingNumber}번 고객을 호출했어요`)}
                        >
                          호출
                        </Button>
                        <Button size="S" variant="ghost" onClick={() => openPending('cancel', w)}>
                          웨이팅 취소
                        </Button>
                      </>
                    )}
                  </div>
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
        onConfirm={confirmPending}
      >
        {pending && `${pending.waiting.waitingNumber}번 ${pending.waiting.customerName}님, ${pending.waiting.partySize}명`}
        <br />
        고객에게 알림이 전송되고 순번이 목록에서 사라져요.
        {pending?.type === 'noShow' && (
          <ChipGroup label="처리 사유" className={styles.sheetChips}>
            {NO_SHOW_REASONS.map((r) => (
              <Chip key={r.value} selected={noShowReason === r.value} onClick={() => setNoShowReason(r.value)}>
                {r.label}
              </Chip>
            ))}
          </ChipGroup>
        )}
        <Textarea
          label={pending?.type === 'noShow' ? '상세 사유' : '취소 사유'}
          placeholder={pending?.type === 'noShow' ? '예) 호출 후 10분 동안 응답 없음' : '예) 재료 소진으로 오늘 영업 마감'}
          maxLength={REASON_MAX}
          rows={3}
          value={reasonText}
          onChange={(e) => setReasonText(e.target.value)}
        />
      </Dialog>

      <BottomSheet isOpen={settingOpen} onClose={() => setSettingOpen(false)} title="웨이팅 운영 설정">
        <p className="t-body-14 text-secondary">호출 후 이 시간 안에 응답하거나 도착하지 않으면 순번이 만료돼요.</p>
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
  if (leftSec <= 0) return <span className="text-danger">, 도착 제한시간 초과</span>
  return (
    <span className="tnum" role="timer">
      , {Math.floor(leftSec / 60)}:{String(leftSec % 60).padStart(2, '0')} 남음
    </span>
  )
}
