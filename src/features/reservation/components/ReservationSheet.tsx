import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { paths } from '@/shared/config'
import { dayjs } from '@/shared/lib/dayjs'
import { formatTime } from '@/shared/lib/format'
import { BottomSheet, Button } from '@/shared/ui'
import { useReservationFormStore } from '../store/reservationFormStore'
import { ReservationDateTimeForm } from './ReservationDateTimeForm'

interface Props {
  storeId: number
  isOpen: boolean
  onClose: () => void
  maxPartySize?: number
  closedDays?: number[]
  /** 진입 시 미리 선택할 날짜 (검색 결과에서 날짜를 눌러 들어온 경우) */
  initialDate?: string | null
}

/** 매장 상세에서 여는 예약 시트 — 날짜·인원·시간 선택 후 다음 단계로 */
export function ReservationSheet({ storeId, isOpen, onClose, maxPartySize, closedDays, initialDate }: Props) {
  const navigate = useNavigate()
  const { date, partySize, time, setStore, setDate } = useReservationFormStore()

  // 검색 결과에서 고른 날짜는 이 매장에서 처음 한 번만 적용 — 다시 열 때 사용자가 고른 날짜·시간을 덮어쓰지 않음
  const appliedInitialDate = useRef<string | null>(null)
  useEffect(() => {
    if (!isOpen) return
    setStore(storeId)
    if (initialDate && appliedInitialDate.current !== initialDate) {
      appliedInitialDate.current = initialDate
      setDate(initialDate)
    }
  }, [isOpen, storeId, initialDate, setStore, setDate])

  const summary = date && time ? `${dayjs(date).format('M월 D일 (dd)')} · ${formatTime(time)} · ${partySize}명` : null

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="예약 일시 선택"
      footer={
        <Button disabled={!summary} onClick={() => navigate(paths.reservation(storeId))}>
          {summary ? `${summary} 선택` : '날짜와 시간을 선택해주세요'}
        </Button>
      }
    >
      <ReservationDateTimeForm maxPartySize={maxPartySize} closedDays={closedDays} />
    </BottomSheet>
  )
}
