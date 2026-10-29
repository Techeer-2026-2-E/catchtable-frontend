import type { ReactNode } from 'react'
import { Bell, ChevronRight, Search } from 'lucide-react'
import { Link } from 'react-router'
import { CATEGORY_EMOJI, StoreCard, type Store } from '@/entities'
import { useCategories, useStoreSearch } from '@/features/store-search'
import { paths, ROUTES } from '@/shared/config'
import { dayjs } from '@/shared/lib/dayjs'
import { Divider, EmptyState, ErrorState, LoadingState, Page } from '@/shared/ui'
import styles from './HomePage.module.css'

/** 오늘 저녁 추천 기준 — 7시, 2명 */
const TONIGHT = { time: '19:00', partySize: 2 }

/**
 * 홈 — 검색바, 음식 종류, 식당 추천
 * 추천은 백엔드가 주는 값으로만 구성 (웨이팅 가능, 오늘 저녁 빈자리). 거리순·인기순은 위치·평점 API 가 생기면 추가
 */
export function HomePage() {
  const today = dayjs().format('YYYY-MM-DD')
  const { data: categories } = useCategories()
  const all = useStoreSearch({})
  const tonight = useStoreSearch({ date: today, time: TONIGHT.time, partySize: TONIGHT.partySize })
  const waitingNow = all.data?.filter((s) => s.waitingAvailable) ?? []
  const tonightLink = `${ROUTES.SEARCH}?date=${today}&time=${TONIGHT.time}&party=${TONIGHT.partySize}`

  return (
    <Page>
      <header className={styles.header}>
        <span className={styles.brand}>캐치테이블</span>
        <Link to={ROUTES.NOTIFICATIONS} className={styles.bell} aria-label="알림">
          <Bell aria-hidden />
        </Link>
      </header>
      <div className={styles.searchWrap}>
        <Link to={ROUTES.SEARCH} className={styles.search}>
          <Search aria-hidden />
          <span>식당 이름으로 검색</span>
        </Link>
      </div>

      <nav className={styles.categories} aria-label="음식 종류">
        {(categories ?? []).map(({ code, name }) => (
          <Link key={code} to={`${ROUTES.SEARCH}?category=${code}`} className={styles.category}>
            <span className={styles.categoryIcon} aria-hidden>
              {CATEGORY_EMOJI[code]}
            </span>
            <span className="t-caption-13">{name}</span>
          </Link>
        ))}
      </nav>

      <Divider thick />

      {all.isPending ? (
        <LoadingState compact />
      ) : all.isError ? (
        <ErrorState onRetry={() => all.refetch()} />
      ) : all.data.length === 0 ? (
        <EmptyState title="등록된 매장이 없어요" />
      ) : (
        <>
          <Shelf title="지금 웨이팅 가능해요" description="원격으로 웨이팅하고 차례가 되면 알림을 받아요" stores={waitingNow} />
          <Shelf
            title="오늘 저녁 7시, 2명 자리 있어요"
            description="지금 바로 예약할 수 있는 매장이에요"
            stores={tonight.data ?? []}
            more={tonightLink}
          />
          <Divider thick />
          <section className={styles.section}>
            <h2 className={`${styles.sectionTitle} t-title-18`}>모든 매장</h2>
            <ul className={styles.list}>
              {all.data.map((store) => (
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

/** 가로로 넘기는 추천 줄 */
function Shelf({ title, description, stores, more }: { title: string; description: ReactNode; stores: Store[]; more?: string }) {
  if (stores.length === 0) return null
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <div>
          <h2 className="t-title-18">{title}</h2>
          <p className="t-caption-13 text-tertiary">{description}</p>
        </div>
        {more && (
          <Link to={more} className={`${styles.more} t-body-14`}>
            전체보기
            <ChevronRight aria-hidden />
          </Link>
        )}
      </div>
      <ul className={styles.shelf}>
        {stores.map((store) => (
          <li key={store.id}>
            <StoreCard store={store} to={paths.storeDetail(store.id)} variant="compact" />
          </li>
        ))}
      </ul>
    </section>
  )
}
