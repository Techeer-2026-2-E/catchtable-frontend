import { Bell } from 'lucide-react'
import { Link } from 'react-router'
import { StoreCard, type StoreCategory } from '@/entities'
import { useCategories, useStoreSearch } from '@/features/store-search'
import { paths, ROUTES } from '@/shared/config'
import { EmptyState, ErrorState, LoadingState, Page, SearchBar, Section } from '@/shared/ui'
import styles from './HomePage.module.css'

const CATEGORY_EMOJI: Record<StoreCategory, string> = {
  KOREAN: '🍚',
  JAPANESE: '🍣',
  CHINESE: '🥟',
  WESTERN: '🍝',
  CAFE: '☕',
  BAR: '🍶',
  ETC: '🍽️',
}

/** 홈 — 카테고리(GET /api/user/categories) + 매장 목록(GET /api/user/stores) */
export function HomePage() {
  const { data: categories } = useCategories()
  const { data: stores, isPending, isError, refetch } = useStoreSearch({})
  const waitingStores = stores?.filter((s) => s.waitingAvailable) ?? []

  return (
    <Page>
      <header className={styles.header}>
        <span className={styles.logo} aria-label="캐치테이블">
          C
        </span>
        <SearchBar to={ROUTES.SEARCH} placeholder="조건으로 매장 찾기" />
        <Link to={ROUTES.NOTIFICATIONS} className={styles.bell} aria-label="알림">
          <Bell aria-hidden />
        </Link>
      </header>

      <nav className={styles.categories} aria-label="카테고리">
        {(categories ?? []).map(({ code, name: label }) => (
          <Link key={code} to={`${ROUTES.SEARCH}?category=${code}`} className={styles.category}>
            <span className={styles.categoryIcon} aria-hidden>
              {CATEGORY_EMOJI[code]}
            </span>
            <span className="t-caption-12">{label}</span>
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
            <Section title="웨이팅 가능한 매장">
              <div className={styles.list}>
                {waitingStores.map((store) => (
                  <StoreCard key={store.id} store={store} to={paths.storeDetail(store.id)} />
                ))}
              </div>
            </Section>
          )}
          <Section title="전체 매장">
            <div className={styles.list}>
              {stores.map((store) => (
                <StoreCard key={store.id} store={store} to={paths.storeDetail(store.id)} />
              ))}
            </div>
          </Section>
        </>
      )}
    </Page>
  )
}
