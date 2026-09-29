import { MOCK_TIME_SLOTS } from '@/entities/mock'
import { dayjs } from '@/shared/lib/dayjs'
import { formatTime } from '@/shared/lib/format'
import { Calendar, Chip, ChipGroup } from '@/shared/ui'
import { useReservationFormStore } from '../store/reservationFormStore'
import styles from './Reservation.module.css'

interface Props {
  maxPartySize?: number
  /** 휴무 요일 (0=일 ~ 6=토) */
  closedDays?: number[]
}

/**
 * 예약 날짜·인원·시간 선택 — 기능명세「예약 날짜·시간 선택」「예약 인원 입력」
 * 시간 칩에는 잔여 테이블 수를 함께 보여줌 (「예약 가능 시간·잔여 테이블 조회」)
 */
export function ReservationDateTimeForm({ maxPartySize = 8, closedDays = [] }: Props) {
  const { date, partySize, time, setDate, setPartySize, setTime } = useReservationFormStore()
  // TODO(API 연동): useAvailability(storeId, date, partySize)
  const slots = date ? MOCK_TIME_SLOTS : []
  const sizes = Array.from({ length: maxPartySize }, (_, i) => i + 1)

  return (
    <div className={styles.form}>
      {/* new Date('YYYY-MM-DD') 는 UTC 로 해석돼 시간대에 따라 요일이 밀리므로 dayjs(로컬) 사용 */}
      <Calendar value={date} onChange={setDate} isDisabled={(d) => closedDays.includes(dayjs(d).day())} />

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
        ) : (
          <div className={styles.slotGrid}>
            {slots.map((slot) => (
              <button
                key={slot.time}
                type="button"
                aria-pressed={time === slot.time}
                disabled={!slot.available}
                className={styles.slot}
                onClick={() => setTime(slot.time)}
              >
                <span className="t-label-13">{formatTime(slot.time)}</span>
                <span className={styles.slotMeta}>{slot.available ? `${slot.remainingTables}테이블` : '마감'}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
