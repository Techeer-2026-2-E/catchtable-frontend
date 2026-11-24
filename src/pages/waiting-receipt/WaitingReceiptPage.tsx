import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { UNFINISHED_RECEIPT_STATUSES, type WaitingReceiptStatus } from '@/entities'
import { useAuthStore } from '@/features/auth'
import { useStoreDetail } from '@/features/store-detail'
import { useWaitingReceipt, useWithdrawWaitingReceipt } from '@/features/waiting'
import { paths, ROUTES } from '@/shared/config'
import { getErrorCode, getErrorMessage, waitingIntakeKeyStorage } from '@/shared/lib'
import { dayjs } from '@/shared/lib/dayjs'
import { Button, DetailSkeleton, Dialog, ErrorState, Page, Ticket, toast, TopBar } from '@/shared/ui'
import styles from './WaitingReceiptPage.module.css'

const LABEL: Record<WaitingReceiptStatus, string> = {
  PENDING: '접수됨',
  PROCESSING: '번호 발급 중',
  REGISTERED: '번호 발급',
  CANCEL_REQUESTED: '취소 확인 중',
  WITHDRAWN: '접수 취소',
  CANCELED: '웨이팅 취소',
}

const MESSAGE: Record<WaitingReceiptStatus, string> = {
  PENDING: '접수 순서대로 대기번호를 발급하고 있어요. 이 화면을 닫아도 접수는 계속돼요',
  PROCESSING: '곧 대기번호가 나와요. 이 화면을 닫아도 접수는 계속돼요',
  REGISTERED: '대기번호가 나왔어요',
  CANCEL_REQUESTED: '취소를 요청했어요. 결과를 확인하고 있어요',
  WITHDRAWN: '번호가 나오기 전에 접수를 취소했어요',
  CANCELED: '웨이팅이 취소됐어요',
}

/**
 * 웨이팅 대기표 — 접수 정책이 켜진 매장에서 신청하면 오는 화면 (GET /api/user/waitings/receipts/{receiptId})
 * 서버가 알려 준 간격으로 다시 조회하다가 번호가 나오면 웨이팅 화면으로 넘어간다
 */
export function WaitingReceiptPage() {
  const { receiptId } = useParams<{ receiptId: string }>()
  const navigate = useNavigate()
  const memberId = useAuthStore((s) => s.member?.id)
  const { data, isPending, isError, refetch } = useWaitingReceipt(receiptId)
  const withdraw = useWithdrawWaitingReceipt(receiptId ?? '')
  const receipt = data?.receipt
  const { data: store } = useStoreDetail(receipt?.storeId ?? NaN)
  const [cancelOpen, setCancelOpen] = useState(false)

  // 번호가 나오면 웨이팅 화면으로, 결과가 확정되면 다음 신청은 새 키로
  const status = receipt?.status
  useEffect(() => {
    if (!receipt || UNFINISHED_RECEIPT_STATUSES.includes(receipt.status)) return
    if (memberId != null) waitingIntakeKeyStorage.clear(memberId, receipt.storeId)
    if (receipt.status === 'REGISTERED' && receipt.waitingId != null) {
      toast(`대기번호 ${receipt.waitNumber}번, 앞에 ${receipt.teamsAhead ?? 0}팀`)
      navigate(paths.waiting(receipt.waitingId), { replace: true })
    }
    // receipt 객체는 조회마다 새로 만들어져 상태가 바뀔 때만 실행
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, memberId, navigate])

  if (isPending || isError || !receipt) {
    return (
      <Page>
        <TopBar title="웨이팅 접수" />
        {isPending ? <DetailSkeleton sections={1} /> : <ErrorState message="대기표를 찾을 수 없어요" onRetry={() => refetch()} />}
      </Page>
    )
  }

  const unfinished = UNFINISHED_RECEIPT_STATUSES.includes(receipt.status)
  const cancellable = receipt.status === 'PENDING' || receipt.status === 'PROCESSING'

  const onWithdraw = () =>
    withdraw.mutate(undefined, {
      onSuccess: ({ receipt: next }) => {
        setCancelOpen(false)
        toast(next.status === 'CANCEL_REQUESTED' ? '취소를 요청했어요. 결과를 확인하고 있어요' : '접수를 취소했어요')
      },
      onError: (e) => {
        setCancelOpen(false)
        toast(
          getErrorCode(e) === 'WAITING_NOT_CANCELLABLE' || receipt.cancelOutcome === 'REJECTED'
            ? '이미 입장했거나 끝난 웨이팅이라 취소할 수 없어요'
            : getErrorMessage(e, '접수를 취소하지 못했어요'),
        )
      },
    })

  return (
    <Page
      bottom={
        cancellable ? (
          <Button variant="soft" fullWidth onClick={() => setCancelOpen(true)}>
            접수 취소
          </Button>
        ) : unfinished ? null : (
          <Button variant="outline" fullWidth onClick={() => navigate(ROUTES.MY_DINING)}>
            내역으로 돌아가기
          </Button>
        )
      }
    >
      <TopBar title={store?.name ?? '웨이팅 접수'} />

      <div className={styles.wrap}>
        <Ticket
          muted={!unfinished}
          stub={
            <p className="t-body-14" aria-live="polite">
              {unfinished && <span className={styles.pulse} aria-hidden />}
              {MESSAGE[receipt.status]}
            </p>
          }
        >
          <div className={styles.ticketHead}>
            <span className="t-label-13">{LABEL[receipt.status]}</span>
            <span className="t-caption-13 tnum">{dayjs(receipt.receivedDate).format('M월 D일 (dd)')}</span>
          </div>
          <p className={styles.number}>
            접수 <span className="tnum">{receipt.intakeSequence}</span>번째
          </p>
          <p className="t-body-14">{receipt.partyCount}명</p>
        </Ticket>

        {unfinished ? (
          <p className="t-caption-13 text-tertiary">접수 순번은 대기번호와 달라요. 번호가 나오면 바로 웨이팅 화면으로 넘어가요.</p>
        ) : (
          <Button variant="outline" fullWidth onClick={() => navigate(paths.waitingApply(receipt.storeId))}>
            다시 웨이팅 신청
          </Button>
        )}
      </div>

      <Dialog
        isOpen={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="접수를 취소할까요?"
        confirmLabel={withdraw.isPending ? '취소 중…' : '접수 취소'}
        onConfirm={onWithdraw}
      >
        번호가 나오는 중이면 취소 결과를 확인하는 데 조금 걸릴 수 있어요.
      </Dialog>
    </Page>
  )
}
