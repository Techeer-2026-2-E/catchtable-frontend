import { useParams } from 'react-router'

export function ReservationDetailPage() {
  const { reservationId } = useParams<{ reservationId: string }>()

  return (
    <main>
      <h1>예약 상세 #{reservationId}</h1>
      {/* TODO: 예약 일시·인원·상태·배정 테이블 (useReservationDetail), 예약 취소 */}
    </main>
  )
}
