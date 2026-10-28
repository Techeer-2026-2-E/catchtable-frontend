import { useState } from 'react'
import type { OwnerReservation } from '@/entities'
import { useOwnerReservationActions } from '@/features/owner-reservation'
import { useAvailability } from '@/features/reservation'
import { getErrorMessage } from '@/shared/lib'
import { dayjs, toStoreDateTime } from '@/shared/lib/dayjs'
import { formatTime } from '@/shared/lib/format'
import { BottomSheet, Button, Chip, ChipGroup, LoadingState, Stepper, toast } from '@/shared/ui'
import styles from './ChangeReservationSheet.module.css'

const DAYS = 14

/**
 * 기능명세「예약 변경」 (P2) — PATCH /api/owner/reservations/{id}
 * 고객 전화 요청 등으로 점주가 날짜·시간·인원을 바꾸면 테이블을 다시 배정하고 고객에게 알림
 */
export function ChangeReservationSheet({
  reservation,
  maxPartySize = 10,
  onClose,
}: {
  reservation: OwnerReservation
  maxPartySize?: number
  onClose: () => void
}) {
  const original = dayjs(reservation.reservationStartAt)
  const [date, setDate] = useState(original.format('YYYY-MM-DD'))
  const [partySize, setPartySize] = useState(reservation.partySize)
  const [time, setTime] = useState<string | null>(original.format('HH:mm'))
  const { change } = useOwnerReservationActions()
  const { data, isPending } = useAvailability(reservation.storeId, date, partySize)

  const isOriginalSlot = (d: string, t: string | null) => d === original.format('YYYY-MM-DD') && t === original.format('HH:mm')
  const unchanged = isOriginalSlot(date, time) && partySize === reservation.partySize
  const days = Array.from({ length: DAYS }, (_, i) => dayjs().startOf('day').add(i, 'day'))
  if (!days.some((d) => d.isSame(original, 'day')) && original.isAfter(dayjs())) days.unshift(original.startOf('day'))

  const submit = () => {
    if (!time || unchanged) return
    change.mutate(
      {
        id: reservation.reservationId,
        body: {
          reservationStartAt: toStoreDateTime(date, time),
          partySize,
        },
      },
      {
        onSuccess: () => {
          toast('예약을 변경했어요. 고객에게 알림이 전송돼요')
          onClose()
        },
        onError: (e) => toast(getErrorMessage(e, '변경하지 못했어요')),
      },
    )
  }

  return (
    <BottomSheet
      isOpen
      onClose={onClose}
      title="예약 변경"
      footer={
        <Button onClick={submit} disabled={!time || unchanged || change.isPending}>
          {change.isPending
            ? '변경 중…'
            : !time
              ? '시간을 선택해주세요'
              : unchanged
                ? '바꿀 날짜·시간·인원을 선택해주세요'
                : `${dayjs(date).format('M/D(dd)')} ${formatTime(time)} · ${partySize}명으로 변경`}
        </Button>
      }
    >
      <div className={styles.body}>
        <p className={styles.current}>
          <span className="text-tertiary">현재</span> {original.format('M/D(dd)')} {formatTime(reservation.reservationStartAt)} ·{' '}
          {reservation.partySize}명 · {reservation.customerName}님
        </p>

        <div className={styles.row}>
          <span className="t-label-15">인원</span>
          <Stepper
            value={partySize}
            onChange={(n) => {
              setPartySize(n)
              if (!isOriginalSlot(date, time)) setTime(null)
            }}
            min={1}
            max={maxPartySize}
            unit="명"
            label="인원"
          />
        </div>

        <div className={styles.field}>
          <span className="t-label-15">날짜</span>
          <ChipGroup scroll label="날짜">
            {days.map((d) => {
              const value = d.format('YYYY-MM-DD')
              return (
                <Chip
                  key={value}
                  size="S"
                  selected={date === value}
                  onClick={() => {
                    setDate(value)
                    setTime(isOriginalSlot(value, original.format('HH:mm')) ? original.format('HH:mm') : null)
                  }}
                >
                  {d.isSame(dayjs(), 'day') ? '오늘' : d.format('M/D(dd)')}
                </Chip>
              )
            })}
          </ChipGroup>
        </div>

        <div className={styles.field}>
          <span className="t-label-15">시간</span>
          {isPending ? (
            <LoadingState compact />
          ) : !data?.slots.length ? (
            <p className="t-caption-13 text-tertiary">이 날은 영업하지 않아요</p>
          ) : (
            <div className={styles.slots}>
              {data.slots.map((slot) => {
                const t = dayjs(slot.reservationStartAt).format('HH:mm')
                // 지금 예약이 잡힌 시간은 자기 테이블 때문에 마감으로 보일 수 있어 항상 선택 가능
                const mine = isOriginalSlot(date, t)
                const available = slot.available || mine
                return (
                  <button
                    key={slot.reservationStartAt}
                    type="button"
                    aria-pressed={time === t}
                    disabled={!available}
                    className={styles.slot}
                    onClick={() => setTime(t)}
                  >
                    <span className="t-label-13">{formatTime(t)}</span>
                    <span className={styles.slotMeta}>
                      {mine ? '현재' : available ? `${slot.availableTableCount}테이블` : '마감'}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
        <p className="t-caption-12 text-tertiary">변경하면 테이블이 다시 배정되고, 고객에게 변경 알림이 전송돼요.</p>
      </div>
    </BottomSheet>
  )
}
