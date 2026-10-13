import { useState } from 'react'
import { Bell, ChevronRight, LocateFixed, MapPin } from 'lucide-react'
import { Link } from 'react-router'
import { StoreCard, type StoreCategory } from '@/entities'
import { useCategories, useHomeStores } from '@/features/store-search'
import { paths, ROUTES } from '@/shared/config'
import { ErrorState, LoadingState, Page, SearchBar, Section, toast } from '@/shared/ui'
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

type Position = { latitude: number; longitude: number }

export function HomePage() {
  const [position, setPosition] = useState<Position | null>(null)
  const [locating, setLocating] = useState(false)
  const { data: categories } = useCategories()
  const { data, isPending, isError, refetch } = useHomeStores(position)

  /** 현재 위치로 주변 매장 보기 (P2 주변 매장) — 권한 거부 시 안내 */
  const locate = () => {
    if (!navigator.geolocation) return toast('이 브라우저에서는 위치를 확인할 수 없어요')
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPosition({ latitude: coords.latitude, longitude: coords.longitude })
        setLocating(false)
      },
      () => {
        setLocating(false)
        toast('위치 권한을 허용하면 주변 매장을 볼 수 있어요')
      },
      { timeout: 8000 },
    )
  }

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
          <span className="t-headline-16">{position ? '내 주변' : '전국'}</span>
        </button>
        <button type="button" className={`${styles.locate} t-caption-13`} onClick={locate} disabled={locating}>
          <LocateFixed aria-hidden />
          {locating ? '위치 확인 중…' : '현재 위치로'}
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
      ) : (
        <>
          {data.nearby.length > 0 && (
            <Section title="내 주변 매장">
              <div className={styles.horizontal}>
                {data.nearby.map((store) => (
                  <StoreCard key={store.id} store={store} to={paths.storeDetail(store.id)} variant="compact" />
                ))}
              </div>
            </Section>
          )}

          <Section
            title="지금 바로 웨이팅"
            action={
              <Link to={`${ROUTES.SEARCH}?waiting=1`} className="t-caption-13 text-tertiary">
                전체보기
              </Link>
            }
          >
            <div className={styles.horizontal}>
              {data.waitingNow.map((store) => (
                <StoreCard key={store.id} store={store} to={paths.storeDetail(store.id)} variant="compact" />
              ))}
            </div>
          </Section>

          <Section title="지금 인기 있는 매장">
            <div className={styles.list}>
              {data.popular.map((store) => (
                <StoreCard key={store.id} store={store} to={paths.storeDetail(store.id)} />
              ))}
            </div>
          </Section>
        </>
      )}
    </Page>
  )
}
