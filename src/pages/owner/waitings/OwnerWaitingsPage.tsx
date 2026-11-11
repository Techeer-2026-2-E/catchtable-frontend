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
import { Badge, BottomSheet, Button, Card, Chip, ChipGroup, Dialog, EmptyState, ErrorState, ListSkeleton, Page, StatLine, Textarea, toast, Toggle, TopBar } from '@/shared/ui'
import styles from './OwnerWaitingsPage.module.css'

type Pending = { type: 'noShow' | 'cancel'; waiting: OwnerWaiting } | null
type NoShowReason = OwnerWaitingNoShowRequest['reason']
const NO_SHOW_REASONS: { value: NoShowReason; label: string }[] = [
  { value: 'NO_RESPONSE', label: '호출 미응답' },
  { value: 'NO_SHOW', label: '미방문(노쇼)' },
]
const REASON_MAX = 300
const hm = (iso: string) => dayjs(iso).format('HH:mm')

/** 1초마다 현재 시각 — 호출 제한시간 표시용 */
function useNow() {
  const [now, setNow] = useState(() => dayjs())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(dayjs()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  return now
}

/**
 * 웨이팅 현황 관리 — 접수 시작·종료, 대기 목록, 호출·다시 호출, 순번 연기, 착석(테이블 선택), 노쇼, 취소
 * 목록 순서는 서버가 준 대기 순서(queue_order) 그대로 쓴다. 접수번호로 다시 정렬하지 않음 (순번 연기 반영)
 * 도착 제한시간 설정은 별도 화면(매장 홈 > 웨이팅 설정)
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
  const now = useNow()
  const [pending, setPending] = useState<Pending>(null)
  const [noShowReason, setNoShowReason] = useState<NoShowReason>('NO_RESPONSE')
  const [reasonText, setReasonText] = useState('')
  const [seating, setSeating] = useState<OwnerWaiting | null>(null)
  const [tableId, setTableId] = useState<number | null>(null)

  const open = settings.data?.open ?? false
  const arrivalLimit = settings.data?.arrivalLimitMinutes ?? 10
  const active = (waitings.data ?? []).filter((w) => ACTIVE_WAITING_STATUSES.includes(w.status))
  const onError = (e: unknown) => toast(getErrorMessage(e, '처리하지 못했어요'))

  const openPending = (type: 'noShow' | 'cancel', waiting: OwnerWaiting) => {
    setNoShowReason('NO_RESPONSE')
    setReasonText('')
    setPending({ type, waiting })
  }

  const openSeat = (w: OwnerWaiting) => {
    setTableId(w.compatibleTables.length === 1 ? w.compatibleTables[0].id : null)
    setSeating(w)
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

  const confirmSeat = () => {
    if (!seating || tableId == null) return
    const table = seating.compatibleTables.find((t) => t.id === tableId)
    actions.enter.mutate(
      { waitingId: seating.id, tableId },
      {
        onSuccess: () => {
          toast(`${seating.waitingNumber}번 고객을 ${table?.tableNumber ?? ''}번 테이블에 앉혔어요`)
          setSeating(null)
        },
        onError,
      },
    )
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
      </div>

      {waitings.isPending ? (
        <ListSkeleton rows={4} variant="card" trailing />
      ) : waitings.isError ? (
        <ErrorState onRetry={() => waitings.refetch()} />
      ) : active.length === 0 ? (
        <EmptyState icon={<UsersRound />} title="대기 중인 고객이 없어요" />
      ) : (
        <ul className={styles.list}>
          {active.map((w) => {
            const called = w.status === 'CALLED' || w.status === 'CONFIRMED'
            const responded = called && w.arrivalIntent === 'COMING' && !!w.respondedAt
            const leftSec = called && w.callExpiresAt ? dayjs(w.callExpiresAt).diff(now, 'second') : null
            const expired = leftSec != null && leftSec <= 0
            const badge = expired ? { label: '응답 없음', tone: 'danger' as const } : { label: WAITING_STATUS_LABEL[w.status === 'CONFIRMED' ? 'CALLED' : w.status], tone: WAITING_STATUS_TONE[w.status] }
            return (
              <Card as="li" key={w.id} className={styles.card}>
                <div className={styles.head}>
                  <p className={`${styles.number} tnum`}>{w.waitingNumber}번</p>
                  <Badge tone={badge.tone}>{badge.label}</Badge>
                </div>
                <div>
                  <p className="t-body-15">
                    {w.customerName}, {w.partySize}명
                  </p>
                  <p className="t-caption-13 text-tertiary tnum">
                    {hm(w.createdAt)} 접수
                    {called && w.calledAt && `, ${hm(w.calledAt)} 호출`}
                  </p>
                </div>

                {called && (
                  <div className={styles.callState} data-tone={expired ? 'danger' : undefined}>
                    <span className="t-body-14">
                      {expired
                        ? '도착 제한시간이 지났어요'
                        : responded
                          ? `가는 중이라고 응답했어요 (${hm(w.respondedAt!)})`
                          : '응답을 기다리고 있어요'}
                    </span>
                    {leftSec != null && (
                      <span className={`${styles.callTime} t-label-13 tnum`} role="timer">
                        {expired
                          ? `${Math.ceil(-leftSec / 60)}분 지남`
                          : responded
                            ? `${hm(w.callExpiresAt!)}까지`
                            : `${Math.floor(leftSec / 60)}:${String(leftSec % 60).padStart(2, '0')} 남음`}
                      </span>
                    )}
                  </div>
                )}

                <div className={styles.actions}>
                  {called ? (
                    expired ? (
                      <>
                        <Button size="M" variant="outline" disabled={actions.recall.isPending} onClick={() => recall(w)}>
                          다시 호출
                        </Button>
                        <Button size="M" variant="outline" onClick={() => openPending('noShow', w)}>
                          노쇼 처리
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button size="M" onClick={() => openSeat(w)}>
                          착석 처리
                        </Button>
                        <Button size="M" variant="outline" disabled={actions.recall.isPending} onClick={() => recall(w)}>
                          다시 호출
                        </Button>
                      </>
                    )
                  ) : (
                    <>
                      <Button
                        size="M"
                        disabled={actions.call.isPending}
                        onClick={() =>
                          actions.call.mutate(w.id, { onSuccess: () => toast(`${w.waitingNumber}번 고객을 호출했어요`), onError })
                        }
                      >
                        호출
                      </Button>
                      <Button
                        size="M"
                        variant="outline"
                        disabled={actions.defer.isPending}
                        onClick={() =>
                          actions.defer.mutate(w.id, {
                            onSuccess: (r) => toast(`${w.waitingNumber}번을 ${r.afterPosition}번째 순서로 미뤘어요 (${r.deferCount}/2)`),
                            onError,
                          })
                        }
                      >
                        한 팀 뒤로
                      </Button>
                      <Button size="M" variant="outline" onClick={() => openPending('cancel', w)}>
                        웨이팅 취소
                      </Button>
                    </>
                  )}
                </div>
                {!called && <p className="t-caption-12 text-tertiary">손님이 부탁하면 바로 뒤 팀과 순서를 바꿔요. 최대 2번까지 돼요.</p>}
              </Card>
            )
          })}
        </ul>
      )}

      <BottomSheet
        isOpen={!!seating}
        onClose={() => setSeating(null)}
        title={seating ? `${seating.waitingNumber}번 ${seating.customerName}님 착석` : ''}
        footer={
          <Button fullWidth disabled={tableId == null || actions.enter.isPending} onClick={confirmSeat}>
            {tableId == null
              ? '테이블을 골라주세요'
              : `${seating?.compatibleTables.find((t) => t.id === tableId)?.tableNumber}번 테이블에 착석 처리`}
          </Button>
        }
      >
        {seating && (
          <>
            <p className="t-body-14 text-secondary">{seating.partySize}명이 앉을 테이블을 골라주세요</p>
            {seating.compatibleTables.length === 0 ? (
              <p className={`${styles.noTable} t-body-14`}>인원에 맞는 운영 중 테이블이 없어요. 테이블 설정을 확인해주세요.</p>
            ) : (
              <ul className={styles.tables} role="radiogroup" aria-label="테이블">
                {seating.compatibleTables.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={tableId === t.id}
                      className={styles.table}
                      onClick={() => setTableId(t.id)}
                    >
                      <span className="t-label-15">{t.tableNumber}번 테이블</span>
                      <span className="t-caption-12 text-secondary">
                        {t.minCapacity === t.capacity ? `${t.capacity}인석` : `${t.minCapacity}~${t.capacity}인석`}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="t-caption-12 text-tertiary">이미 다른 손님이 앉은 테이블인지는 직접 확인해주세요.</p>
          </>
        )}
      </BottomSheet>

      <Dialog
        isOpen={!!pending}
        onClose={() => setPending(null)}
        title={pending?.type === 'noShow' ? '노쇼로 처리할까요?' : '웨이팅을 취소할까요?'}
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
          placeholder={pending?.type === 'noShow' ? `예) 호출 후 ${arrivalLimit}분 동안 응답 없음` : '예) 재료 소진으로 오늘 영업 마감'}
          maxLength={REASON_MAX}
          rows={3}
          value={reasonText}
          onChange={(e) => setReasonText(e.target.value)}
        />
      </Dialog>
    </Page>
  )

  function recall(w: OwnerWaiting) {
    actions.recall.mutate(w.id, {
      onSuccess: () => toast(`${w.waitingNumber}번 고객을 다시 호출했어요. 제한시간이 처음부터 다시 흘러요`),
      onError,
    })
  }
}
