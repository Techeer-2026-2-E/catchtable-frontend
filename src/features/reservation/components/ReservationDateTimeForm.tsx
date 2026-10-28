import { toDayOfWeek, type DayOfWeek } from '@/entities'
import { dayjs } from '@/shared/lib/dayjs'
import { formatTime } from '@/shared/lib/format'
import { Calendar, Chip, ChipGroup, ErrorState, LoadingState } from '@/shared/ui'
import { useAvailability } from '../hooks/useAvailability'
import { useReservationFormStore } from '../store/reservationFormStore'
import styles from './Reservation.module.css'

interface Props {
  storeId: number
  maxPartySize?: number
  /** 영업하는 요일 (매장 상세 businessHours 기준) — 없으면 모든 요일 선택 가능 */
  openDays?: DayOfWeek[]
}

/**
 * 예약 날짜·인원·시간 선택 — 기능명세「예약 날짜·시간 선택」「예약 인원 입력」
 * 시간 칩에는 잔여 테이블 수를 함께 보여줌 (「예약 가능 시간·잔여 테이블 조회」 GET /availability)
 */
export function ReservationDateTimeForm({ storeId, maxPartySize = 8, openDays }: Props) {
  const { date, partySize, time, setDate, setPartySize, setTime } = useReservationFormStore()
  const { data, isPending, isError, refetch } = useAvailability(storeId, date, partySize)
  const sizes = Array.from({ length: maxPartySize }, (_, i) => i + 1)

  return (
    <div className={styles.form}>
      <Calendar
        value={date}
        onChange={setDate}
        // new Date('YYYY-MM-DD') 는 UTC 로 해석돼 시간대에 따라 요일이 밀리므로 dayjs(로컬) 사용
        isDisabled={openDays ? (d) => !openDays.includes(toDayOfWeek(dayjs(d).day())) : undefined}
      />

      <div className={styles.field}>
        <p className="t-headline-16">인원</p>
        <ChipGroup scroll label="인원">
          {sizes.map((n) => (
            <Chip key={n} selected={partySize === n} onClick={() => setPartySize(n)}>
              {n}명
            </Chip>
          ))}
        </ChipGroup>
      </div>

      <div className={styles.field}>
        <p className="t-headline-16">시간</p>
        {!date ? (
          <p className="t-caption-13 text-tertiary">날짜를 먼저 선택해주세요</p>
        ) : isPending ? (
          <LoadingState compact />
        ) : isError ? (
          <ErrorState message="예약 가능 시간을 불러오지 못했어요" onRetry={() => refetch()} />
        ) : data.slots.length === 0 ? (
          <p className="t-caption-13 text-tertiary">이 날은 예약을 받지 않아요</p>
        ) : (
          <div className={styles.slotGrid}>
            {data.slots.map((slot) => {
              const slotTime = dayjs(slot.reservationStartAt).format('HH:mm')
              return (
                <button
                  key={slot.reservationStartAt}
                  type="button"
                  aria-pressed={time === slotTime}
                  disabled={!slot.available}
                  className={styles.slot}
                  onClick={() => setTime(slotTime)}
                >
                  <span className="t-label-13">{formatTime(slotTime)}</span>
                  <span className={styles.slotMeta}>{slot.available ? `${slot.availableTableCount}석` : '마감'}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
