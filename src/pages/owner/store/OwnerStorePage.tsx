import { useParams } from 'react-router'

export function OwnerStorePage() {
  const { storeId } = useParams<{ storeId: string }>()

  return (
    <main>
      <h1>매장 관리 #{storeId}</h1>
      {/* TODO: 기본 정보 수정, 영업시간·휴무일, 예약 정책 */}
    </main>
  )
}
