import { useEffect, useState } from 'react'
import { BellRing } from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import { WAITING_STATUS_LABEL, WAITING_STATUS_TONE, type WaitingStatus } from '@/entities'
import { MOCK_WAITINGS } from '@/entities/mock'
import { ROUTES } from '@/shared/config'
import { dayjs } from '@/shared/lib/dayjs'
import { Badge, Banner, Button, Dialog, Divider, Page, Section, toast, TopBar } from '@/shared/ui'
import styles from './WaitingPage.module.css'

const ARRIVAL_LIMIT_SECONDS = 10 * 60
const MINUTES_PER_TEAM = 3

/**
 * 기능명세「현재 대기순번 조회」「대기순번 실시간 갱신」「입장 호출 알림」「호출 응답·도착 의사 확인」「고객 웨이팅 취소」
 *
 * TODO(API 연동): useWaitingPosition(waitingId) + useWaitingSSE(waitingId) 로 교체.
 * 지금은 SSE 대신 5초마다 순번이 줄어드는 시뮬레이션으로 화면 흐름을 확인할 수 있게 함
 */
export function WaitingPage() {
  const { waitingId } = useParams<{ waitingId: string }>()
  const navigate = useNavigate()
  const waiting = MOCK_WAITINGS.find((w) => w.id === Number(waitingId)) ?? MOCK_WAITINGS[0]
  const [teamsAhead, setTeamsAhead] = useState(waiting.teamsAhead ?? 2)
  const [status, setStatus] = useState<WaitingStatus>(waiting.status)
  const [arrivalLeft, setArrivalLeft] = useState(ARRIVAL_LIMIT_SECONDS)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [responded, setResponded] = useState(false)

  // 실시간 갱신 시뮬레이션 — 5초마다 앞 팀이 줄고, 내 차례가 되면 입장 호출
  useEffect(() => {
    if (status !== 'WAITING') return
    const timer = window.setTimeout(() => {
      if (teamsAhead > 0) setTeamsAhead(teamsAhead - 1)
      else setStatus('CALLED')
    }, 5000)
    return () => window.clearTimeout(timer)
  }, [status, teamsAhead])

  // 호출 후 도착 제한시간 카운트다운
  useEffect(() => {
    if (status !== 'CALLED') return
    const timer = window.setInterval(() => setArrivalLeft((s) => Math.max(0, s - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [status])

  const isActive = status === 'WAITING' || status === 'CALLED'
  const mm = String(Math.floor(arrivalLeft / 60)).padStart(2, '0')
  const ss = String(arrivalLeft % 60).padStart(2, '0')

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
      <TopBar title={waiting.storeName} />

      {status === 'CALLED' && (
        <section className={styles.called} aria-live="assertive">
          <div className={styles.calledHead}>
            <BellRing aria-hidden />
            <div>
              <p className="t-headline-16">입장 가능합니다!</p>
              <p className="t-caption-13 text-secondary">
                {responded ? '매장에 도착 의사를 전달했어요' : `${mm}:${ss} 안에 도착 의사를 알려주세요`}
              </p>
            </div>
          </div>
          {!responded && (
            <div className={styles.calledActions}>
              <Button
                size="M"
                className={styles.flex}
                onClick={() => {
                  setResponded(true)
                  toast('매장에 도착했다고 알렸어요')
                }}
              >
                도착했어요
              </Button>
              <Button
                size="M"
                variant="soft"
                className={styles.flex}
                onClick={() => {
                  setResponded(true)
                  toast('조금 늦는다고 알렸어요')
                }}
              >
                조금 늦어요
              </Button>
            </div>
          )}
        </section>
      )}

      <section className={styles.ticket}>
        <Badge tone={WAITING_STATUS_TONE[status]} solid={status === 'CALLED'}>
          {WAITING_STATUS_LABEL[status]}
        </Badge>
        {status === 'WAITING' && (
          <>
            <p className="t-caption-13 text-secondary">내 대기순번 · 실시간 갱신 중</p>
            <p className={styles.position}>
              <span className="t-display-28">{teamsAhead + 1}</span>번째
            </p>
            <p className="t-body-14 text-secondary">
              앞에 {teamsAhead}팀 · 예상 대기 약 {Math.max(teamsAhead, 1) * MINUTES_PER_TEAM}분
            </p>
          </>
        )}
        {status === 'CALLED' && (
          <>
            <p className="t-caption-13 text-secondary">대기번호</p>
            <p className={styles.position}>
              <span className="t-display-28">{waiting.waitingNumber}</span>번
            </p>
            <p className="t-body-14 text-secondary">매장 입구에서 대기번호를 말씀해주세요</p>
          </>
        )}
        {!isActive && <p className="t-body-14 text-secondary">웨이팅이 종료됐어요</p>}
      </section>

      <Divider thick />
      <Section title="웨이팅 정보">
        <dl className={styles.info}>
          <dt>대기번호</dt>
          <dd>{waiting.waitingNumber}번</dd>
          <dt>인원</dt>
          <dd>{waiting.partySize}명</dd>
          <dt>좌석 조건</dt>
          <dd>{waiting.seatPreference ?? '상관없음'}</dd>
          <dt>접수 시각</dt>
          <dd>{dayjs(waiting.createdAt).format('HH:mm')}</dd>
        </dl>
      </Section>
      {isActive && (
        <Section>
          <Banner tone="info">호출 후 10분 안에 응답하지 않거나 착석하지 않으면 순번이 자동으로 만료돼요.</Banner>
        </Section>
      )}

      <Dialog
        isOpen={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="웨이팅을 취소할까요?"
        confirmLabel="웨이팅 취소"
        onConfirm={() => {
          setStatus('CANCELED')
          setCancelOpen(false)
          toast('웨이팅을 취소했어요')
        }}
      >
        취소하면 현재 순번이 사라지고 다시 신청해야 해요.
      </Dialog>
    </Page>
  )
}
