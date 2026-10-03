import { Bell, ChevronRight, LocateFixed, MapPin } from 'lucide-react'
import { Link } from 'react-router'
import { STORE_CATEGORY_LABEL, StoreCard, type StoreCategory } from '@/entities'
import { MOCK_STORES } from '@/entities/mock'
import { paths, ROUTES } from '@/shared/config'
import { Page, SearchBar, Section } from '@/shared/ui'
import styles from './HomePage.module.css'

// TODO(API 연동): useHomeStores(주변·인기 매장), useCategories 로 교체
const CATEGORIES = Object.entries(STORE_CATEGORY_LABEL) as [StoreCategory, string][]
const CATEGORY_EMOJI: Record<StoreCategory, string> = {
  KOREAN: '🍚',
  JAPANESE: '🍣',
  CHINESE: '🥟',
  WESTERN: '🍝',
  CAFE: '☕',
  BAR: '🍶',
  ETC: '🍽️',
}

export function HomePage() {
  const popular = [...MOCK_STORES].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
  const waitingStores = MOCK_STORES.filter((s) => s.waitingAvailable)

  return (
    <Page>
      <header className={styles.header}>
        <span className={styles.logo} aria-label="캐치테이블">
          C
        </span>
        <SearchBar to={ROUTES.SEARCH} placeholder="줄서기·예약 매장을 검색해 보세요" />
        <Link to={ROUTES.NOTIFICATIONS} className={styles.bell} aria-label="알림">
          <Bell aria-hidden />
        </Link>
      </header>

      <div className={styles.location}>
        <button type="button" className={styles.locationButton}>
          <MapPin aria-hidden />
          <span className="t-headline-16">전국</span>
        </button>
        <button type="button" className={`${styles.locate} t-caption-13`}>
          <LocateFixed aria-hidden />
          현재 위치로
        </button>
      </div>

      <Link to={ROUTES.SEARCH} className={styles.promo}>
        <div>
          <p className="t-caption-13 text-accent">이번 주 예약금 0원</p>
          <p className="t-title-18">
            오늘 저녁,
            <br />
            기다림 없이 바로 예약
          </p>
        </div>
        <span className={styles.promoLink}>
          둘러보기 <ChevronRight aria-hidden />
        </span>
      </Link>

      <nav className={styles.categories} aria-label="카테고리">
        {CATEGORIES.map(([code, label]) => (
          <Link key={code} to={`${ROUTES.SEARCH}?category=${code}`} className={styles.category}>
            <span className={styles.categoryIcon} aria-hidden>
              {CATEGORY_EMOJI[code]}
            </span>
            <span className="t-caption-12">{label}</span>
          </Link>
        ))}
      </nav>

      <Section
        title="지금 바로 웨이팅"
        action={
          <Link to={`${ROUTES.SEARCH}?waiting=1`} className="t-caption-13 text-tertiary">
            전체보기
          </Link>
        }
      >
        <div className={styles.horizontal}>
          {waitingStores.map((store) => (
            <StoreCard key={store.id} store={store} to={paths.storeDetail(store.id)} variant="compact" />
          ))}
        </div>
      </Section>

      <Section title="지금 인기 있는 매장">
        <div className={styles.list}>
          {popular.map((store) => (
            <StoreCard key={store.id} store={store} to={paths.storeDetail(store.id)} />
          ))}
        </div>
      </Section>
    </Page>
  )
}
