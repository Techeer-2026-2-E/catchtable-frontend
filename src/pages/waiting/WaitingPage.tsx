import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ACTIVE_WAITING_STATUSES, WAITING_STATUS_LABEL, type WaitingStatus } from '@/entities'
import { useWaitingActions, useWaitingDetail } from '@/features/waiting'
import { paths, ROUTES } from '@/shared/config'
import { getErrorMessage } from '@/shared/lib'
import { dayjs } from '@/shared/lib/dayjs'
import { Button, Dialog, ErrorState, LoadingState, Page, Ticket, toast, TopBar } from '@/shared/ui'
import styles from './WaitingPage.module.css'

const ENDED_MESSAGE: Partial<Record<WaitingStatus, string>> = {
  SEATED: '착석했어요. 맛있게 드세요',
  CANCELED: '웨이팅이 취소됐어요',
  NO_SHOW: '호출에 응답하지 않거나 제한시간 안에 입장하지 않아 순번이 만료됐어요',
}

/**
 * 기능명세「현재 대기순번 조회」「대기순번 실시간 갱신」「입장 호출 알림」「호출 응답·도착 의사 확인」
 * 「고객 웨이팅 취소」「호출 미응답·미착석 순번 만료」
 *
 * 순번은 GET /api/user/waitings/{id} 를 5초마다 다시 받고, 호출·만료 같은 상태 변화는
 * 실시간 알림(SSE)이 오면 즉시 갱신됨 (app/providers/RealtimeNotifications)
 */
export function WaitingPage() {
  const { waitingId } = useParams<{ waitingId: string }>()
  const id = Number(waitingId)
  const navigate = useNavigate()
  const { data: waiting, isPending, isError, refetch } = useWaitingDetail(id)
  const { accept, cancel } = useWaitingActions(id)
  const [cancelOpen, setCancelOpen] = useState(false)
  const remaining = useRemainingSeconds(waiting?.expiresAt ?? null)

  if (isPending || isError) {
    return (
      <Page>
        <TopBar title="웨이팅" />
        {isPending ? <LoadingState /> : <ErrorState message="웨이팅을 찾을 수 없어요" onRetry={() => refetch()} />}
      </Page>
    )
  }

  const status = waiting.status
  const isActive = ACTIVE_WAITING_STATUSES.includes(status)
  const called = status === 'CALLED' || status === 'CONFIRMED'
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')
  const onError = (e: unknown) => toast(getErrorMessage(e))

  return (
    <Page
      bottom={
        isActive ? (
          <Button variant="soft" fullWidth onClick={() => setCancelOpen(true)}>
            웨이팅 취소
          </Button>
        ) : (
          <Button variant="outline" fullWidth onClick={() => navigate(ROUTES.MY_DINING)}>
            내역으로 돌아가기
          </Button>
        )
      }
    >
      <TopBar title={waiting.storeName ?? '웨이팅'} />

      <div className={styles.wrap}>
        <Ticket
          muted={!isActive}
          stub={
            status === 'WAITING' ? (
              <div className={styles.stubRow}>
                <p>
                  <span className={`${styles.stubValue} tnum`}>{waiting.currentPosition ?? (waiting.teamsAhead ?? 0) + 1}</span>
                  번째 순서
                </p>
                <p className="t-body-14">앞에 {waiting.teamsAhead ?? 0}팀</p>
              </div>
            ) : called ? (
              <div className={styles.called} aria-live="assertive">
                <p className="t-headline-16">
                  {status === 'CONFIRMED' ? '도착을 알렸어요. 입장해주세요' : '입장 차례예요. 도착을 알려주세요'}
                </p>
                <p className="t-body-14">
                  남은 시간{' '}
                  <strong className="tnum">
                    {mm}:{ss}
                  </strong>
                </p>
                {status === 'CALLED' && (
                  <Button
                    variant="secondary"
                    fullWidth
                    disabled={accept.isPending}
                    onClick={() => accept.mutate(undefined, { onSuccess: () => toast('매장에 도착했다고 알렸어요'), onError })}
                  >
                    지금 가고 있어요
                  </Button>
                )}
              </div>
            ) : (
              <p className="t-body-14">{ENDED_MESSAGE[status]}</p>
            )
          }
        >
          <div className={styles.ticketHead}>
            <span className="t-label-13">{WAITING_STATUS_LABEL[status]}</span>
            <span className="t-caption-13 tnum">{dayjs(waiting.waitingDate).format('M월 D일 (dd)')}</span>
          </div>
          <p className={styles.number}>
            <span className="tnum">{waiting.waitNumber}</span>번
          </p>
          <p className="t-body-14">{waiting.partyCount}명</p>
        </Ticket>

        {isActive ? (
          <p className="t-caption-13 text-tertiary">
            순번은 실시간으로 바뀌어요. 호출 후 제한시간 안에 응답하거나 입장하지 않으면 순번이 만료돼요.
          </p>
        ) : (
          status !== 'SEATED' && (
            <Button variant="outline" fullWidth onClick={() => navigate(paths.waitingApply(waiting.storeId))}>
              다시 웨이팅 신청
            </Button>
          )
        )}
      </div>

      <Dialog
        isOpen={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="웨이팅을 취소할까요?"
        confirmLabel={cancel.isPending ? '취소 중…' : '웨이팅 취소'}
        onConfirm={() =>
          cancel.mutate(undefined, {
            onSuccess: () => {
              setCancelOpen(false)
              toast('웨이팅을 취소했어요')
            },
            onError,
          })
        }
      >
        취소하면 현재 순번이 사라지고 다시 신청해야 해요.
      </Dialog>
    </Page>
  )
}

/** 호출 응답 제한 시각까지 남은 초 — 1초마다 갱신 */
function useRemainingSeconds(expiresAt: string | null) {
  const [now, setNow] = useState(() => dayjs())
  useEffect(() => {
    if (!expiresAt) return
    const timer = window.setInterval(() => setNow(dayjs()), 1000)
    return () => window.clearInterval(timer)
  }, [expiresAt])
  return expiresAt ? Math.max(0, dayjs(expiresAt).diff(now, 'second')) : 0
}
