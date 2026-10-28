import { useEffect, useState } from 'react'
import { BellRing } from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import { ACTIVE_WAITING_STATUSES, WAITING_STATUS_LABEL, WAITING_STATUS_TONE } from '@/entities'
import { useWaitingActions, useWaitingDetail } from '@/features/waiting'
import { isFeatureAvailable, paths, ROUTES } from '@/shared/config'
import { getErrorMessage } from '@/shared/lib'
import { dayjs } from '@/shared/lib/dayjs'
import { Badge, Banner, Button, Dialog, Divider, ErrorState, LoadingState, Page, Section, toast, TopBar } from '@/shared/ui'
import styles from './WaitingPage.module.css'

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
  const { accept, defer, cancel } = useWaitingActions(id)
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

      {called && (
        <section className={styles.called} aria-live="assertive">
          <div className={styles.calledHead}>
            <BellRing aria-hidden />
            <div>
              <p className="t-headline-16">입장 가능합니다!</p>
              <p className="t-caption-13 text-secondary">
                {status === 'CONFIRMED'
                  ? `매장에 도착을 알렸어요 · ${mm}:${ss} 안에 입장해주세요`
                  : `${mm}:${ss} 안에 도착 의사를 알려주세요`}
              </p>
            </div>
          </div>
          <div className={styles.calledActions}>
            {status === 'CALLED' && (
              <Button
                size="M"
                className={styles.flex}
                disabled={accept.isPending}
                onClick={() => accept.mutate(undefined, { onSuccess: () => toast('매장에 도착했다고 알렸어요'), onError })}
              >
                도착했어요
              </Button>
            )}
            {isFeatureAvailable('waitingDefer') && (waiting.deferRemaining ?? 0) > 0 && (
              <Button
                size="M"
                variant="soft"
                className={styles.flex}
                disabled={defer.isPending}
                onClick={() =>
                  defer.mutate(undefined, {
                    onSuccess: () => toast('조금 늦는다고 알렸어요. 도착 시간이 5분 늘어났어요'),
                    onError,
                  })
                }
              >
                조금 늦어요
              </Button>
            )}
          </div>
        </section>
      )}

      <section className={styles.ticket}>
        <Badge tone={WAITING_STATUS_TONE[status]} solid={called}>
          {WAITING_STATUS_LABEL[status]}
        </Badge>
        {status === 'WAITING' && (
          <>
            <p className="t-caption-13 text-secondary">내 대기순번 · 실시간 갱신 중</p>
            <p className={styles.position}>
              <span className="t-display-28">{waiting.currentPosition ?? (waiting.teamsAhead ?? 0) + 1}</span>번째
            </p>
            <p className="t-body-14 text-secondary">
              앞에 {waiting.teamsAhead ?? 0}팀
              {waiting.estimatedMinutes != null && ` · 예상 대기 약 ${waiting.estimatedMinutes}분`}
            </p>
          </>
        )}
        {called && (
          <>
            <p className="t-caption-13 text-secondary">대기번호</p>
            <p className={styles.position}>
              <span className="t-display-28">{waiting.waitNumber}</span>번
            </p>
            <p className="t-body-14 text-secondary">매장 입구에서 대기번호를 말씀해주세요</p>
          </>
        )}
        {status === 'NO_SHOW' && (
          <p className="t-body-14 text-secondary">
            호출에 응답하지 않았거나 제한시간 안에 입장하지 않아 순번이 만료됐어요.
            <br />
            다시 방문하시려면 웨이팅을 새로 신청해주세요.
          </p>
        )}
        {status === 'CANCELED' && <p className="t-body-14 text-secondary">웨이팅이 취소됐어요</p>}
        {status === 'SEATED' && <p className="t-body-14 text-secondary">착석이 완료됐어요. 맛있게 드세요!</p>}
        {!isActive && status !== 'SEATED' && (
          <Button variant="ghost" size="S" onClick={() => navigate(paths.waitingApply(waiting.storeId))}>
            다시 신청하기
          </Button>
        )}
      </section>

      <Divider thick />
      <Section title="웨이팅 정보">
        <dl className={styles.info}>
          <dt>대기번호</dt>
          <dd>{waiting.waitNumber}번</dd>
          <dt>인원</dt>
          <dd>{waiting.partyCount}명</dd>
          <dt>날짜</dt>
          <dd>{dayjs(waiting.waitingDate).format('M월 D일 (dd)')}</dd>
          {waiting.seatPreference !== undefined && (
            <>
              <dt>좌석 조건</dt>
              <dd>{waiting.seatPreference ?? '상관없음'}</dd>
            </>
          )}
          {waiting.createdAt && (
            <>
              <dt>접수 시각</dt>
              <dd>{dayjs(waiting.createdAt).format('HH:mm')}</dd>
            </>
          )}
        </dl>
      </Section>
      {isActive && (
        <Section>
          <Banner tone="info">호출 후 제한시간 안에 응답하지 않거나 착석하지 않으면 순번이 자동으로 만료돼요.</Banner>
        </Section>
      )}

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
