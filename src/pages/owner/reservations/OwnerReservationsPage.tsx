import { useParams } from 'react-router'

export function OwnerReservationsPage() {
  const { storeId } = useParams<{ storeId: string }>()

  return (
    <main>
      <h1>예약 관리 #{storeId}</h1>
      {/* TODO: 예약 현황, 방문 확인 / 노쇼 / 취소 (useOwnerReservations) */}
    </main>
  )
}
