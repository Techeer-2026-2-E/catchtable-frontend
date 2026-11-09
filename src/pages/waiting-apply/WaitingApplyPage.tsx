import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { describeNextOpen, getOpenState } from '@/entities'
import { useStoreDetail } from '@/features/store-detail'
import { useRegisterWaiting } from '@/features/waiting'
import { paths } from '@/shared/config'
import { getErrorCode, getErrorMessage } from '@/shared/lib'
import { Banner, Button, ErrorState, LoadingState, Page, Section, Stepper, toast, TopBar } from '@/shared/ui'
import styles from './WaitingApplyPage.module.css'

/** 백엔드 WaitingCreateRequest 의 인원 범위 */
const MAX_PARTY = 20

/** 기능명세「원격 웨이팅 신청」「웨이팅 인원 입력」 — POST /api/user/waitings { storeId, partyCount } */
export function WaitingApplyPage() {
  const { storeId } = useParams<{ storeId: string }>()
  const navigate = useNavigate()
  const { data: store, isPending, isError, refetch } = useStoreDetail(Number(storeId))
  const register = useRegisterWaiting()
  const [partySize, setPartySize] = useState(2)

  if (isPending || isError) {
    return (
      <Page>
        <TopBar title="웨이팅 신청" />
        {isPending ? <LoadingState /> : <ErrorState onRetry={() => refetch()} />}
      </Page>
    )
  }

  const { open, nextOpenAt } = getOpenState(store.businessHours)
  const accepting = store.waitingAvailable && open

  const submit = () =>
    register.mutate(
      { storeId: store.id, partyCount: partySize },
      {
        onSuccess: (waiting) => {
          toast(`대기번호 ${waiting.waitNumber}번, 앞에 ${waiting.teamsAhead}팀`)
          navigate(paths.waiting(waiting.waitingId), { replace: true })
        },
        onError: (e) =>
          toast(
            getErrorCode(e) === 'WAITING_OUTSIDE_BUSINESS_HOURS'
              ? '지금은 영업시간이 아니라 웨이팅을 받지 않아요'
              : getErrorMessage(e, '웨이팅을 신청하지 못했어요'),
          ),
      },
    )

  return (
    <Page
      bottom={
        <Button fullWidth onClick={submit} disabled={!accepting || register.isPending}>
          {register.isPending
            ? '신청 중…'
            : store.waitingAvailable && !open
              ? '영업시간에 신청할 수 있어요'
              : `${partySize}명 웨이팅 신청하기`}
        </Button>
      }
    >
      <TopBar title="웨이팅 신청" />

      {store.waitingAvailable && !open ? (
        <div className={styles.banner}>
          <Banner tone="notice">
            지금은 영업시간이 아니라 웨이팅을 받지 않아요.
            {nextOpenAt && ` ${describeNextOpen(nextOpenAt)} 신청할 수 있어요.`}
          </Banner>
        </div>
      ) : (
        <div className={styles.status} data-closed={!accepting || undefined}>
          <span className={styles.dot} aria-hidden />
          <p className="t-body-14-strong">{accepting ? '웨이팅 접수 중' : '지금은 웨이팅을 받지 않아요'}</p>
        </div>
      )}

      <Section>
        <h2 className="t-title-18">{store.name}</h2>
        <p className="t-caption-13 text-tertiary">{store.address}</p>
      </Section>

      <Section title="인원" action={<Stepper value={partySize} onChange={setPartySize} min={1} max={MAX_PARTY} unit="명" label="인원" />}>
        <p className="t-caption-13 text-tertiary">유아를 포함한 전체 방문 인원을 입력해주세요</p>
      </Section>
    </Page>
  )
}
