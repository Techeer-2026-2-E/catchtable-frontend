import { useParams } from 'react-router'

export function ReservationPage() {
  const { storeId } = useParams<{ storeId: string }>()

  return (
    <main>
      <h1>예약하기 #{storeId}</h1>
      {/* TODO: 날짜 → 인원 → 시간 선택 (useAvailability, useReservationForm) → 자동 확정 */}
    </main>
  )
}
