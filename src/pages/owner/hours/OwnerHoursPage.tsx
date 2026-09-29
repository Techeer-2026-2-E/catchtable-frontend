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

  // 마감이 오픈보다 이르면 다음날 마감(예: 17:00 ~ 02:00)으로 본다. 같으면 영업시간 0 이라 오류
  const isOvernight = (h: BusinessHour) => h.closeTime < h.openTime
  const invalid =
    hours.some((h) => !h.closed && h.openTime === h.closeTime) ||
    (breakTime.enabled && breakTime.start >= breakTime.end)

  return (
    <Page
      bottom={
        <Button fullWidth disabled={invalid} onClick={() => toast('영업시간을 저장했어요')}>
          저장
        </Button>
      }
    >
      <TopBar title="영업시간 관리" />
      <p className={`${styles.hint} t-caption-13 text-tertiary`}>
        마감 시간이 오픈보다 이르면 다음날 새벽 마감으로 저장돼요.
      </p>
      <ul className={styles.list}>
        {ORDER.map((day) => {
          const h = hours.find((x) => x.dayOfWeek === day)!
          const wrong = !h.closed && h.openTime === h.closeTime
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
                  {isOvernight(h) && <span className={styles.nextDay}>다음날</span>}
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
          <Banner tone="danger">
            {breakTime.enabled && breakTime.start >= breakTime.end
              ? '브레이크타임 종료는 시작보다 늦어야 해요.'
              : '오픈과 마감 시간이 같아요. 24시간 영업이면 00:00 ~ 23:59 로 입력해주세요.'}
          </Banner>
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
