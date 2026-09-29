import { useState } from 'react'
import type { BusinessHour } from '@/entities'
import { MOCK_BUSINESS_HOURS } from '@/entities/mock'
import { Banner, Button, Page, Section, toast, Toggle, TopBar } from '@/shared/ui'
import styles from './OwnerHoursPage.module.css'

const DAY_LABEL = ['일', '월', '화', '수', '목', '금', '토']
/** 월요일부터 표시 */
const ORDER = [1, 2, 3, 4, 5, 6, 0]

/** 기능명세「영업시간 관리」 */
export function OwnerHoursPage() {
  // TODO(API 연동): 영업시간 조회, ownerStoreApi.updateBusinessHours
  const [hours, setHours] = useState<BusinessHour[]>(MOCK_BUSINESS_HOURS)
  const [breakTime, setBreakTime] = useState({ enabled: true, start: '15:00', end: '17:00' })

  const update = (day: number, patch: Partial<BusinessHour>) =>
    setHours((list) => list.map((h) => (h.dayOfWeek === day ? { ...h, ...patch } : h)))

  const invalid = hours.some((h) => !h.closed && h.openTime >= h.closeTime)

  return (
    <Page
      bottom={
        <Button fullWidth disabled={invalid} onClick={() => toast('영업시간을 저장했어요')}>
          저장
        </Button>
      }
    >
      <TopBar title="영업시간 관리" />
      <ul className={styles.list}>
        {ORDER.map((day) => {
          const h = hours.find((x) => x.dayOfWeek === day)!
          const wrong = !h.closed && h.openTime >= h.closeTime
          return (
            <li key={day} className={`${styles.day} ${h.closed ? styles.closed : ''}`}>
              <span className={`${styles.label} t-headline-16`}>{DAY_LABEL[day]}</span>
              {h.closed ? (
                <span className="t-body-14 text-tertiary">휴무</span>
              ) : (
                <div className={styles.times}>
                  <input
                    type="time"
                    aria-label={`${DAY_LABEL[day]}요일 오픈 시간`}
                    value={h.openTime}
                    onChange={(e) => update(day, { openTime: e.target.value })}
                    aria-invalid={wrong}
                  />
                  <span className="text-tertiary">~</span>
                  <input
                    type="time"
                    aria-label={`${DAY_LABEL[day]}요일 마감 시간`}
                    value={h.closeTime}
                    onChange={(e) => update(day, { closeTime: e.target.value })}
                    aria-invalid={wrong}
                  />
                </div>
              )}
              <Toggle
                checked={!h.closed}
                label={`${DAY_LABEL[day]}요일 영업`}
                onChange={(on) => update(day, { closed: !on })}
              />
            </li>
          )
        })}
      </ul>
      {invalid && (
        <Section>
          <Banner tone="danger">마감 시간은 오픈 시간보다 늦어야 해요.</Banner>
        </Section>
      )}

      <Section
        title="브레이크타임"
        action={
          <Toggle
            checked={breakTime.enabled}
            label="브레이크타임 사용"
            onChange={(enabled) => setBreakTime({ ...breakTime, enabled })}
          />
        }
      >
        {breakTime.enabled ? (
          <div className={styles.times}>
            <input
              type="time"
              aria-label="브레이크타임 시작"
              value={breakTime.start}
              onChange={(e) => setBreakTime({ ...breakTime, start: e.target.value })}
            />
            <span className="text-tertiary">~</span>
            <input
              type="time"
              aria-label="브레이크타임 종료"
              value={breakTime.end}
              onChange={(e) => setBreakTime({ ...breakTime, end: e.target.value })}
            />
            <span className="t-caption-13 text-tertiary">영업일 공통</span>
          </div>
        ) : (
          <p className="t-caption-13 text-tertiary">브레이크타임 없이 영업해요</p>
        )}
      </Section>
    </Page>
  )
}
