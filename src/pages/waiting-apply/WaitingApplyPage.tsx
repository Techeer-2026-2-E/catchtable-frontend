import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { describeNextOpen, getOpenState } from '@/entities'
import { useAuthStore } from '@/features/auth'
import { useStoreDetail } from '@/features/store-detail'
import { retryAfterOf, useRegisterWaiting, type WaitingSubmitResult } from '@/features/waiting'
import { paths } from '@/shared/config'
import { getErrorCode, getErrorMessage, waitingIntakeKeyStorage } from '@/shared/lib'
import { Banner, Button, DetailSkeleton, ErrorState, Page, Section, Stepper, toast, TopBar } from '@/shared/ui'
import styles from './WaitingApplyPage.module.css'

/** 백엔드 WaitingCreateRequest 의 인원 범위 */
const MAX_PARTY = 20

/** 같은 키로 다시 보내면 안 되는 확정 실패 — 다음 신청은 새 키로 */
const FINAL_ERRORS = ['WAITING_CLOSED', 'WAITING_OUTSIDE_BUSINESS_HOURS', 'DUPLICATE_ACTIVE_WAITING', 'WAITING_RECEIPT_KEY_CONFLICT', 'INVALID_INPUT']

/**
 * 기능명세「원격 웨이팅 신청」「웨이팅 인원 입력」 — POST /api/user/waitings { storeId, partyCount } + Idempotency-Key
 * 매장 접수 정책에 따라 바로 번호를 받거나(기존), 대기표를 받는다(202 → 대기표 화면에서 번호 발급까지 확인)
 */
export function WaitingApplyPage() {
  const { storeId } = useParams<{ storeId: string }>()
  const navigate = useNavigate()
  const { data: store, isPending, isError, refetch } = useStoreDetail(Number(storeId))
  const memberId = useAuthStore((s) => s.member?.id)
  const register = useRegisterWaiting()
  const [partySize, setPartySize] = useState(2)

  if (isPending || isError) {
    return (
      <Page>
        <TopBar title="웨이팅 신청" />
        {isPending ? <DetailSkeleton sections={1} /> : <ErrorState onRetry={() => refetch()} />}
      </Page>
    )
  }

  const { open, nextOpenAt } = getOpenState(store.businessHours)
  const accepting = store.waitingAvailable && open

  const clearKey = () => memberId != null && waitingIntakeKeyStorage.clear(memberId, store.id)

  const onSubmitted = (result: WaitingSubmitResult, firstTry: boolean) => {
    if (result.kind === 'waiting') {
      clearKey()
      toast(`대기번호 ${result.waiting.waitNumber}번, 앞에 ${result.waiting.teamsAhead}팀`)
      navigate(paths.waiting(result.waiting.waitingId), { replace: true })
      return
    }
    const { receipt } = result
    if (receipt.status === 'REGISTERED' && receipt.waitingId != null) {
      clearKey()
      toast(`대기번호 ${receipt.waitNumber}번, 앞에 ${receipt.teamsAhead ?? 0}팀`)
      navigate(paths.waiting(receipt.waitingId), { replace: true })
      return
    }
    // 같은 키로 예전에 접수했다가 취소한 표가 돌아오면 새 키로 한 번 다시 신청
    if (receipt.status === 'WITHDRAWN' || receipt.status === 'CANCELED') {
      clearKey()
      if (firstTry) send(false)
      return
    }
    toast('웨이팅을 접수했어요. 번호가 나오면 알려드릴게요')
    navigate(paths.waitingReceipt(receipt.receiptId), { replace: true })
  }

  const send = (firstTry: boolean) => {
    if (memberId == null) return
    const key = waitingIntakeKeyStorage.get(memberId, store.id, partySize)
    register.mutate(
      { body: { storeId: store.id, partyCount: partySize }, key },
      {
        onSuccess: (result) => onSubmitted(result, firstTry),
        onError: (e) => {
          const code = getErrorCode(e)
          if (code && FINAL_ERRORS.includes(code)) clearKey()
          if (code === 'WAITING_INTAKE_FULL') {
            const sec = retryAfterOf(e)
            toast(`지금 신청이 몰려 있어요. ${sec ? `${sec}초 뒤에 ` : '잠시 후 '}다시 신청해 주세요`)
          } else if (code === 'WAITING_OUTSIDE_BUSINESS_HOURS') {
            toast('지금은 영업시간이 아니라 웨이팅을 받지 않아요')
          } else if (code === 'WAITING_RECEIPT_KEY_CONFLICT') {
            toast('신청 정보가 바뀌었어요. 한 번 더 눌러 주세요')
          } else if (!code || code === 'WAITING_RECEIPT_UNCONFIRMED') {
            // 결과를 모름 — 키를 남겨 두고 같은 버튼으로 다시 확인
            toast('접수 결과를 확인하지 못했어요. 잠시 후 다시 눌러 주세요')
          } else {
            toast(getErrorMessage(e, '웨이팅을 신청하지 못했어요'))
          }
        },
      },
    )
  }
  const submit = () => send(true)

  return (
    <Page
      bottom={
        <Button fullWidth onClick={submit} disabled={!accepting || register.isPending}>
          {register.isPending
            ? register.failureCount > 0
              ? '접수 결과 확인 중…'
              : '신청 중…'
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
