import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { paths } from '@/shared/config'
import { dayjs } from '@/shared/lib/dayjs'
import { formatTime } from '@/shared/lib/format'
import { BottomSheet, Button } from '@/shared/ui'
import { useReservationFormStore } from '../store/reservationFormStore'
import { useAvailability } from '../hooks/useAvailability'
import { ReservationDateTimeForm } from './ReservationDateTimeForm'

interface Props {
  storeId: number
  isOpen: boolean
  onClose: () => void
  maxPartySize?: number
  /** 검색 결과에서 고른 초기 조건 */
  initialDate?: string | null
  initialTime?: string | null
  initialPartySize?: number
}

/** 매장 상세에서 여는 예약 시트 — 날짜·인원·시간 선택 후 다음 단계로 */
export function ReservationSheet({ storeId, isOpen, onClose, maxPartySize, initialDate, initialTime, initialPartySize }: Props) {
  const navigate = useNavigate()
  const { date, partySize, time, setStore, setDate, setPartySize, setTime } = useReservationFormStore()
  const availability = useAvailability(storeId, date, partySize, isOpen)

  // 같은 진입 조건은 한 번만 적용해 다시 열 때 사용자가 수정한 값을 보존한다.
  const appliedInitialSelection = useRef<string | null>(null)
  useEffect(() => {
    if (!isOpen) return
    setStore(storeId)
    const selection = [storeId, initialDate, initialTime, initialPartySize].join('|')
    if (initialDate && appliedInitialSelection.current !== selection) {
      appliedInitialSelection.current = selection
      setDate(initialDate)
      if (initialPartySize) setPartySize(initialPartySize)
      if (initialTime) setTime(initialTime)
    }
  }, [isOpen, storeId, initialDate, initialTime, initialPartySize, setStore, setDate, setPartySize, setTime])

  const summary = date && time ? `${dayjs(date).format('M월 D일 (dd)')} ${formatTime(time)}, ${partySize}명` : null
  const selectedAvailable = availability.data?.storeId === storeId && availability.data.date === date
    && availability.data.partySize === partySize
    && availability.data.slots.some((slot) => slot.available && dayjs(slot.reservationStartAt).format('HH:mm') === time)

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="예약 일시 선택"
      footer={
        <Button disabled={!summary || !selectedAvailable || availability.isFetching || availability.isError} onClick={() => navigate(paths.reservation(storeId))}>
          {summary ? `${summary} 선택` : '날짜와 시간을 선택해주세요'}
        </Button>
      }
    >
      <ReservationDateTimeForm storeId={storeId} maxPartySize={maxPartySize} />
    </BottomSheet>
  )
}
