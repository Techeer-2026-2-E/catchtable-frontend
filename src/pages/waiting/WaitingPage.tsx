import { useParams } from 'react-router'

export function WaitingPage() {
  const { waitingId } = useParams<{ waitingId: string }>()

  return (
    <main>
      <h1>웨이팅 #{waitingId}</h1>
      {/* TODO: 실시간 대기순번 (useWaitingPosition + useWaitingSSE), 호출 수락 / 순번 연기 / 취소 */}
    </main>
  )
}
