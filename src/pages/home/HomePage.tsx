import { useState } from 'react'
import { Bell } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { StoreCard } from '@/entities'
import { useCategories, useStoreSearch } from '@/features/store-search'
import { paths, ROUTES } from '@/shared/config'
import { dayjs } from '@/shared/lib/dayjs'
import { formatTime } from '@/shared/lib/format'
import { Button, EmptyState, ErrorState, LoadingState, Page, Stepper } from '@/shared/ui'
import styles from './HomePage.module.css'

const DAYS_AHEAD = 7
const TIMES = ['12:00', '13:00', '18:00', '19:00', '20:00']

/**
 * 홈 — 맨 위에서 날짜·시간·인원을 고르면 빈자리 검색(GET /api/user/stores?date&time&partySize)으로 이동
 * 아래는 카테고리(GET /api/user/categories)와 매장 목록
 */
export function HomePage() {
  const navigate = useNavigate()
  const { data: categories } = useCategories()
  const { data: stores, isPending, isError, refetch } = useStoreSearch({})
  const [date, setDate] = useState(() => dayjs().format('YYYY-MM-DD'))
  const [time, setTime] = useState('19:00')
  const [partySize, setPartySize] = useState(2)

  const days = Array.from({ length: DAYS_AHEAD }, (_, i) => dayjs().add(i, 'day'))
  const waitingStores = stores?.filter((s) => s.waitingAvailable) ?? []
  const findSeats = () => navigate(`${ROUTES.SEARCH}?date=${date}&time=${time}&party=${partySize}`)

  return (
    <Page>
      <header className={styles.header}>
        <span className={styles.logo} aria-label="캐치테이블">
          C
        </span>
        <Link to={ROUTES.NOTIFICATIONS} className={styles.bell} aria-label="알림">
          <Bell aria-hidden />
        </Link>
      </header>

      <section className={styles.finder} aria-labelledby="finder-title">
        <h1 id="finder-title" className="t-title-24">
          언제, 몇 명이 가세요?
        </h1>

        <div className={styles.days} role="radiogroup" aria-label="날짜">
          {days.map((d) => {
            const value = d.format('YYYY-MM-DD')
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={date === value}
                className={styles.day}
                onClick={() => setDate(value)}
              >
                <span className="t-caption-12">{d.isSame(dayjs(), 'day') ? '오늘' : d.format('dd')}</span>
                <span className={`${styles.dayNumber} tnum`}>{d.date()}</span>
              </button>
            )
          })}
        </div>

        <div className={styles.times} role="radiogroup" aria-label="시간">
          {TIMES.map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={time === t}
              className={`${styles.time} tnum`}
              onClick={() => setTime(t)}
            >
              {formatTime(t)}
            </button>
          ))}
        </div>

        <div className={styles.party}>
          <span className="t-body-15">인원</span>
          <Stepper value={partySize} onChange={setPartySize} min={1} max={20} unit="명" label="인원" />
        </div>

        <Button fullWidth onClick={findSeats}>
          빈자리 찾기
        </Button>
      </section>

      <nav className={styles.categories} aria-label="카테고리">
        {(categories ?? []).map(({ code, name }) => (
          <Link key={code} to={`${ROUTES.SEARCH}?category=${code}`} className={styles.category}>
            {name}
          </Link>
        ))}
      </nav>

      {isPending ? (
        <LoadingState compact />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : stores.length === 0 ? (
        <EmptyState title="등록된 매장이 없어요" />
      ) : (
        <>
          {waitingStores.length > 0 && (
            <section className={styles.group}>
              <h2 className={styles.groupTitle}>
                <span className="t-headline-16">지금 줄 서기 가능</span>
                <span className="t-caption-13 text-tertiary tnum">{waitingStores.length}곳</span>
              </h2>
              <ul className={styles.list}>
                {waitingStores.map((store) => (
                  <li key={store.id}>
                    <StoreCard store={store} to={paths.storeDetail(store.id)} />
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section className={styles.group}>
            <h2 className={styles.groupTitle}>
              <span className="t-headline-16">전체 매장</span>
              <span className="t-caption-13 text-tertiary tnum">{stores.length}곳</span>
            </h2>
            <ul className={styles.list}>
              {stores.map((store) => (
                <li key={store.id}>
                  <StoreCard store={store} to={paths.storeDetail(store.id)} />
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </Page>
  )
}
