import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { findMockStore, MOCK_WAITINGS } from '@/entities/mock'
import { paths } from '@/shared/config'
import { Banner, Button, Chip, ChipGroup, Page, Section, Stepper, toast, TopBar } from '@/shared/ui'
import styles from './WaitingApplyPage.module.css'

const SEAT_OPTIONS = ['상관없음', '테이블석', '바석']
const MINUTES_PER_TEAM = 3
const ARRIVAL_LIMIT_MINUTES = 10

/** 기능명세「원격 웨이팅 신청」「웨이팅 인원 입력」 */
export function WaitingApplyPage() {
  const { storeId } = useParams<{ storeId: string }>()
  const navigate = useNavigate()
  // TODO(API 연동): useStoreDetail(storeId), useRegisterWaiting
  const store = findMockStore(storeId)
  const [partySize, setPartySize] = useState(2)
  const [seat, setSeat] = useState(SEAT_OPTIONS[0])
  const teams = store.waitingTeams ?? 0

  const submit = () => {
    toast('웨이팅을 신청했어요')
    navigate(paths.waiting(MOCK_WAITINGS[0].id), { replace: true })
  }

  return (
    <Page
      bottom={
        <Button fullWidth onClick={submit} disabled={!store.waitingAvailable}>
          {partySize}명 웨이팅 신청하기
        </Button>
      }
    >
      <TopBar title="웨이팅 신청" />

      <div className={styles.status}>
        <span className={styles.dot} aria-hidden />
        <p className="t-body-14-strong">
          {store.waitingAvailable ? '웨이팅 접수 중' : '지금은 웨이팅을 받지 않아요'}
        </p>
        <span className="t-caption-13 text-secondary">· 현재 {teams}팀 대기</span>
      </div>

      <Section>
        <h2 className="t-title-18">{store.name}</h2>
        <p className="t-caption-13 text-tertiary">{store.address}</p>
      </Section>

      <Section title="인원" action={<Stepper value={partySize} onChange={setPartySize} min={1} max={store.maxPartySize ?? 8} unit="명" label="인원" />}>
        <p className="t-caption-13 text-tertiary">유아를 포함한 전체 방문 인원을 입력해주세요</p>
      </Section>

      <Section title="좌석 조건" action={<span className="t-caption-13 text-tertiary">선택</span>}>
        <ChipGroup label="좌석 조건">
          {SEAT_OPTIONS.map((option) => (
            <Chip key={option} selected={seat === option} onClick={() => setSeat(option)}>
              {option}
            </Chip>
          ))}
        </ChipGroup>
      </Section>

      <Section>
        <div className={styles.estimate}>
          <div>
            <p className="t-caption-13 text-tertiary">예상 대기시간</p>
            <p className="t-title-18">약 {Math.max(teams, 1) * MINUTES_PER_TEAM}분</p>
          </div>
          <div>
            <p className="t-caption-13 text-tertiary">내 앞 대기</p>
            <p className="t-title-18">{teams}팀</p>
          </div>
        </div>
        <Banner tone="info">
          입장 호출 후 {ARRIVAL_LIMIT_MINUTES}분 안에 응답하지 않으면 순번이 자동으로 만료돼요.
        </Banner>
      </Section>
    </Page>
  )
}
