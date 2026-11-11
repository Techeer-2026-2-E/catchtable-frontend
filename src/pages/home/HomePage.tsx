import type { ReactNode } from 'react'
import { Bell, ChevronRight, Search } from 'lucide-react'
import { Link } from 'react-router'
import { StoreCard, type Store } from '@/entities'
import { DEFAULT_CENTER, formatDistance, useNearbyStores } from '@/features/store-map'
import { useCategories, useStoreSearch } from '@/features/store-search'
import { paths, ROUTES } from '@/shared/config'
import { dayjs } from '@/shared/lib/dayjs'
import { useGeolocation } from '@/shared/lib/useGeolocation'
import { Button, Divider, EmptyState, ErrorState, ListSkeleton, Page, ShelfSkeleton, Skeleton } from '@/shared/ui'
import styles from './HomePage.module.css'

/** 오늘 저녁 추천 기준 — 7시, 2명 */
const TONIGHT = { time: '19:00', partySize: 2 }

/** 내 주변 매장 줄에 보여줄 개수 */
const NEARBY_SIZE = 10

/**
 * 홈 — 검색바, 음식 종류 칩, 식당 추천
 * 추천: 내 주변(GET /user/stores/map/radius, 1km), 오늘 저녁 빈자리, 웨이팅 가능
 */
export function HomePage() {
  const today = dayjs().format('YYYY-MM-DD')
  const { data: categories } = useCategories()
  const all = useStoreSearch({})
  const tonight = useStoreSearch({ date: today, time: TONIGHT.time, partySize: TONIGHT.partySize })
  const stores = all.data ?? []
  const waitingNow = stores.filter((s) => s.waitingAvailable)
  const tonightLink = `${ROUTES.SEARCH}?date=${today}&time=${TONIGHT.time}&party=${TONIGHT.partySize}`

  return (
    <Page>
      <header className={styles.header}>
        <span className={styles.brand}>캐치테이블</span>
      </header>
      <div className={styles.searchWrap}>
        <Link to={ROUTES.SEARCH} className={styles.search}>
          <Search aria-hidden />
          <span>식당 이름으로 검색</span>
        </Link>
        <Link to={ROUTES.NOTIFICATIONS} className={styles.mapLink}>
          <Bell aria-hidden />
          <span>알림</span>
        </Link>
      </div>

      <nav className={styles.categories} aria-label="음식 종류">
        {(categories ?? []).map(({ code, name }) => (
          <Link key={code} to={`${ROUTES.SEARCH}?category=${code}`} className={styles.category}>
            {name}
          </Link>
        ))}
      </nav>

      <Divider thick />

      {all.isPending ? (
        <>
          <NearbyShelf />
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <Skeleton width="55%" height={22} />
            </div>
            <ShelfSkeleton />
          </section>
          <Divider thick />
          <section className={styles.section}>
            <h2 className={`${styles.sectionTitle} t-title-18`}>모든 매장</h2>
            <ListSkeleton rows={3} thumb="small" variant="card" className={styles.list} />
          </section>
        </>
      ) : all.isError && stores.length === 0 ? (
        <ErrorState onRetry={() => all.refetch()} />
      ) : stores.length === 0 ? (
        <EmptyState title="등록된 매장이 없어요" />
      ) : (
        <>
          <NearbyShelf />
          <Shelf
            title="오늘 저녁 7시, 2명 자리 있어요"
            description="지금 바로 예약할 수 있는 매장이에요"
            stores={tonight.data ?? []}
            more={tonightLink}
          />
          <Shelf title="지금 웨이팅 가능해요" description="원격으로 웨이팅하고 차례가 되면 알림을 받아요" stores={waitingNow} />
          <Divider thick />
          <section className={styles.section}>
            <h2 className={`${styles.sectionTitle} t-title-18`}>모든 매장</h2>
            <ul className={styles.list}>
              {stores.map((store) => (
                <li key={store.id}>
                  <StoreCard store={store} to={paths.storeDetail(store.id)} />
                </li>
              ))}
            </ul>
            {all.isFetchNextPageError ? (
              <ErrorState message="매장을 더 불러오지 못했어요" onRetry={() => all.fetchNextPage()} />
            ) : all.hasNextPage && (
              <Button variant="outline" fullWidth disabled={all.isFetching} onClick={() => all.fetchNextPage()}>
                {all.isFetchingNextPage ? '불러오는 중…' : '더 보기'}
              </Button>
            )}
          </section>
        </>
      )}
    </Page>
  )
}

/**
 * 내 주변 매장 — 내 위치 반경(백엔드 store.nearby.radius-meters, 기본 1km) 가까운 순
 * 위치 권한이 없으면 강남역 기준으로 보여주고 설명에서 알려줌
 */
function NearbyShelf() {
  const geo = useGeolocation()
  const settled = geo.status !== 'idle' && geo.status !== 'pending'
  const origin = geo.position ?? (settled ? DEFAULT_CENTER : null)
  const { data, isPending, isError, refetch } = useNearbyStores(origin, NEARBY_SIZE)
  const stores = data?.stores ?? []

  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <div>
          <h2 className="t-title-18">내 주변 매장</h2>
          <p className="t-caption-13 text-tertiary">
            {geo.position || !settled ? '지금 있는 곳에서 가까운 순서예요' : '위치를 허용하면 내 주변으로 보여드려요. 지금은 강남역 근처예요'}
          </p>
        </div>
        <Link to={ROUTES.STORE_MAP} className={`${styles.more} t-body-14`}>
          지도로 보기
          <ChevronRight aria-hidden />
        </Link>
      </div>
      {!origin || isPending ? (
        <ShelfSkeleton />
      ) : isError ? (
        <ErrorState message="주변 매장을 불러오지 못했어요" onRetry={() => refetch()} />
      ) : stores.length === 0 ? (
        <p className={`${styles.shelfEmpty} t-body-14 text-tertiary`}>1km 안에 매장이 없어요. 지도에서 다른 곳을 찾아보세요</p>
      ) : (
        <ul className={styles.shelf}>
          {stores.map((store) => (
            <li key={store.id}>
              <StoreCard
                store={store}
                to={paths.storeDetail(store.id)}
                variant="compact"
                meta={[store.categoryName, formatDistance(store.distanceMeters)].filter(Boolean).join(', ')}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
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
