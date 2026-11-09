import {
  getReservationDisplayStatus,
  RESERVATION_STATUS_LABEL,
  type OwnerReservation,
  type ReservationDisplayStatus,
  type StoreTable,
} from '@/entities'
import { dayjs } from '@/shared/lib/dayjs'
import { formatPhone } from '@/shared/lib/format'
import { Badge, BottomSheet, Button, type BadgeTone } from '@/shared/ui'
import styles from './OwnerReservationsPage.module.css'

const TONE: Record<ReservationDisplayStatus, BadgeTone> = {
  PENDING_PAYMENT: 'neutral',
  CONFIRMED: 'brand',
  VISITED: 'primary',
  COMPLETED: 'neutral',
  NO_SHOW: 'danger',
  CANCELLED: 'neutral',
  EXPIRED: 'neutral',
}

interface Props {
  reservation: OwnerReservation
  table?: StoreTable
  canNoShow: boolean
  noShowAvailableAt: string
  entering: boolean
  onClose: () => void
  onEnter: () => void
  onChange: () => void
  onCancel: () => void
  onNoShow: () => void
}

/** 예약 상세 팝업 — 와이어프레임「예약 상세 (팝업)」. 응답에 있는 값만 보여준다 */
export function ReservationDetailSheet({
  reservation: r,
  table,
  canNoShow,
  noShowAvailableAt,
  entering,
  onClose,
  onEnter,
  onChange,
  onCancel,
  onNoShow,
}: Props) {
  const display = getReservationDisplayStatus(r)
  const start = dayjs(r.reservationStartAt)
  const at = (iso: string | null) => (iso ? dayjs(iso).format('M월 D일 A h:mm') : null)
  const rows: [string, string | null][] = [
    ['테이블', table ? `${table.tableNumber}번 (${table.capacity}인석)` : '배정 전'],
    ['예약번호', String(r.reservationId)],
    ['이용 시간', `${start.format('HH:mm')} ~ ${dayjs(r.reservationEndAt).format('HH:mm')}`],
    ['방문 확인', at(r.checkedInAt)],
    ['취소 시각', at(r.cancelledAt)],
    ['노쇼 처리', at(r.noShowAt)],
  ]
  const reason = r.cancellationReason ?? r.noShowReason

  return (
    <BottomSheet
      isOpen
      onClose={onClose}
      title={<Badge tone={TONE[display]}>{RESERVATION_STATUS_LABEL[display]}</Badge>}
      footer={
        display === 'CONFIRMED' ? (
          <div className={styles.sheetActions}>
            <Button fullWidth disabled={entering} onClick={onEnter}>
              방문 확인
            </Button>
            <div className={styles.sheetRow}>
              <Button variant="secondary" onClick={onChange}>
                변경
              </Button>
              <Button variant="secondary" onClick={onCancel}>
                취소
              </Button>
              <Button variant="secondary" disabled={!canNoShow} onClick={onNoShow}>
                노쇼 처리
              </Button>
            </div>
            {!canNoShow && <p className="t-caption-12 text-tertiary">노쇼 처리는 {noShowAvailableAt}부터 가능해요</p>}
          </div>
        ) : undefined
      }
    >
      <div className={styles.sheet}>
        <div>
          <p className="t-title-20">{r.customerName}</p>
          <p className="t-body-14 text-secondary tnum">{formatPhone(r.customerPhone)}</p>
        </div>
        <div className={styles.when}>
          <p className={`${styles.whenTime} tnum`}>{start.format('A h:mm')}</p>
          <p className="t-body-14 text-secondary">
            {start.format('M월 D일 (dd)')}, {r.partySize}명
          </p>
        </div>
        <dl className={styles.facts}>
          {rows
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k}>
                <dt className="t-body-14 text-secondary">{k}</dt>
                <dd className="t-body-14 tnum">{v}</dd>
              </div>
            ))}
        </dl>
        {reason && (
          <div className={styles.note}>
            <p className="t-caption-12 text-secondary">
              {display === 'NO_SHOW' ? '노쇼 사유' : r.cancellationActor === 'OWNER' ? '매장 취소 사유' : '고객 취소 사유'}
            </p>
            <p className="t-body-14">{reason}</p>
          </div>
        )}
      </div>
    </BottomSheet>
  )
}
