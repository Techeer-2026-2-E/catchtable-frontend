import { useParams } from 'react-router'

export function OwnerWaitingsPage() {
  const { storeId } = useParams<{ storeId: string }>()

  return (
    <main>
      <h1>웨이팅 관리 #{storeId}</h1>
      {/* TODO: 접수 시작·종료, 대기 고객 목록, 호출 / 착석 / 노쇼 (useOwnerWaitings) */}
    </main>
  )
}
