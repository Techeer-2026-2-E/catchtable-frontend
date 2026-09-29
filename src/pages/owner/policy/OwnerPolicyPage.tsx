import { useState } from 'react'
import { TABLE_TYPE_LABEL, type TableType } from '@/entities'
import type { ReservationPolicy } from '@/features/owner-store'
import { Button, Chip, ChipGroup, Divider, Page, Section, Textarea, toast, TopBar } from '@/shared/ui'
import styles from './OwnerPolicyPage.module.css'

const SLOT_OPTIONS = [15, 30, 60]
const DURATION_OPTIONS = [60, 90, 120, 150]
const GRACE_OPTIONS = [5, 10, 15, 20]
const MAX_PARTY_OPTIONS = [4, 6, 8, 10]
const DEPOSIT_OPTIONS = ['없음', '1인당 정액', '메뉴 금액 전액'] // P2: 예약금
const minutesLabel = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}시간${m % 60 ? ` ${m % 60}분` : ''}` : `${m}분`)

/** 기능명세「예약 정책 관리」 */
export function OwnerPolicyPage() {
  // TODO(API 연동): 예약 정책 조회, ownerStoreApi.updateReservationPolicy
  const [policy, setPolicy] = useState<ReservationPolicy>({
    reservationSlotMinutes: 30,
    reservationDurationMinutes: 120,
    arrivalGraceMinutes: 10,
  })
  const [maxParty, setMaxParty] = useState(6)
  const [spaceTypes, setSpaceTypes] = useState<TableType[]>(['ROOM', 'HALL'])
  const [deposit, setDeposit] = useState(DEPOSIT_OPTIONS[0])
  const [notice, setNotice] = useState('')

  const set = (patch: Partial<ReservationPolicy>) => setPolicy((p) => ({ ...p, ...patch }))
  const toggleSpace = (type: TableType) =>
    setSpaceTypes((list) => (list.includes(type) ? list.filter((t) => t !== type) : [...list, type]))

  return (
    <Page
      bottom={
        <Button fullWidth disabled={spaceTypes.length === 0} onClick={() => toast('예약 정책을 저장했어요')}>
          저장
        </Button>
      }
    >
      <TopBar title="예약 정책 관리" />

      <Section title="예약 시간 단위" action={<span className="t-caption-13 text-tertiary">고객이 고를 수 있는 간격</span>}>
        <ChipGroup label="예약 시간 단위">
          {SLOT_OPTIONS.map((m) => (
            <Chip key={m} selected={policy.reservationSlotMinutes === m} onClick={() => set({ reservationSlotMinutes: m })}>
              {minutesLabel(m)}
            </Chip>
          ))}
        </ChipGroup>
      </Section>

      <Section title="1회 이용 시간" action={<span className="t-caption-13 text-tertiary">이후 자동 이용 완료</span>}>
        <ChipGroup label="1회 이용 시간">
          {DURATION_OPTIONS.map((m) => (
            <Chip
              key={m}
              selected={policy.reservationDurationMinutes === m}
              onClick={() => set({ reservationDurationMinutes: m })}
            >
              {minutesLabel(m)}
            </Chip>
          ))}
        </ChipGroup>
      </Section>

      <Section title="도착 유예 시간" action={<span className="t-caption-13 text-tertiary">지나면 노쇼 처리 가능</span>}>
        <ChipGroup label="도착 유예 시간">
          {GRACE_OPTIONS.map((m) => (
            <Chip key={m} selected={policy.arrivalGraceMinutes === m} onClick={() => set({ arrivalGraceMinutes: m })}>
              {m}분
            </Chip>
          ))}
        </ChipGroup>
      </Section>

      <Divider thick />

      <Section title="최대 예약 가능 인원">
        <ChipGroup label="최대 예약 가능 인원">
          {MAX_PARTY_OPTIONS.map((n) => (
            <Chip key={n} selected={maxParty === n} onClick={() => setMaxParty(n)}>
              {n === 10 ? '10명 이상 문의' : `${n}명`}
            </Chip>
          ))}
        </ChipGroup>
      </Section>

      <Section title="예약 가능 공간" action={<span className="t-caption-13 text-tertiary">복수 선택</span>}>
        <ChipGroup label="예약 가능 공간">
          {(Object.keys(TABLE_TYPE_LABEL) as TableType[]).map((type) => (
            <Chip key={type} selected={spaceTypes.includes(type)} onClick={() => toggleSpace(type)}>
              {TABLE_TYPE_LABEL[type]}
            </Chip>
          ))}
        </ChipGroup>
        {spaceTypes.length === 0 && <p className="t-caption-12 text-danger">한 개 이상 선택해주세요</p>}
      </Section>

      <Section title="예약금" action={<span className="t-caption-13 text-tertiary">준비 중</span>}>
        <ChipGroup label="예약금">
          {DEPOSIT_OPTIONS.map((d) => (
            <Chip key={d} selected={deposit === d} onClick={() => setDeposit(d)} disabled={d !== DEPOSIT_OPTIONS[0]}>
              {d}
            </Chip>
          ))}
        </ChipGroup>
      </Section>

      <Divider thick />
      <Section title="사전 공지사항">
        <Textarea
          value={notice}
          onChange={(e) => setNotice(e.target.value)}
          placeholder="코스 메뉴 매장으로, 알레르기가 있으신 분은 예약 시 미리 알려주세요."
          maxLength={300}
        />
      </Section>
      <div className={styles.spacer} />
    </Page>
  )
}
