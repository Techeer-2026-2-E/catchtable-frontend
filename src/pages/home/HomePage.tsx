import type { ReactNode } from 'react'
import { Bell, ChevronRight, Search } from 'lucide-react'
import { Link } from 'react-router'
import { getCategoryPhoto, STORE_CATEGORY_LABEL, StoreCard, type Category, type LatLng, type Store, type StoreCategory } from '@/entities'
import { useAuthStore } from '@/features/auth'
import { useHasUnreadNotification } from '@/features/notification'
import { DEFAULT_CENTER, formatDistance, useNearbyStores, usePopularNearbyStores } from '@/features/store-map'
import { useCategories, useStoreSearch } from '@/features/store-search'
import { paths, ROUTES } from '@/shared/config'
import { dayjs } from '@/shared/lib/dayjs'
import { useGeolocation } from '@/shared/lib/useGeolocation'
import { Button, Divider, EmptyState, ErrorState, ListSkeleton, Logo, Page, ShelfSkeleton, Skeleton } from '@/shared/ui'
import styles from './HomePage.module.css'
import { BannerCarousel, CategoryBest, CategoryGrid, RegionSection, type Banner, type Region } from './HomeSections'

/** 오늘 저녁 추천 기준 — 7시, 2명 */
const TONIGHT = { time: '19:00', partySize: 2 }

/** 내 주변 매장 줄에 보여줄 개수 */
const NEARBY_SIZE = 10

/** 음식 종류 API 가 오기 전에도 같은 칸을 그려 아래 섹션이 밀리지 않게 (CLS) — 백엔드 StoreCategory 와 같은 목록 */
const FALLBACK_CATEGORIES: Category[] = Object.entries(STORE_CATEGORY_LABEL).map(([code, name]) => ({ code: code as StoreCategory, name }))

/** 지역 바로가기 — 데모 입점 매장이 있는 곳 먼저 */
const REGIONS: Region[] = [
  { name: '강남역', center: { lat: 37.4979, lng: 127.0276 } },
  { name: '성수', center: { lat: 37.5446, lng: 127.0559 } },
  { name: '홍대입구', center: { lat: 37.5572, lng: 126.9245 } },
  { name: '잠실', center: { lat: 37.5133, lng: 127.1001 } },
  { name: '종로', center: { lat: 37.5704, lng: 126.9921 } },
  { name: '여의도', center: { lat: 37.5219, lng: 126.9245 } },
]

/**
 * 홈 — 검색바, 음식 종류 칩, 식당 추천
 * 추천: 내 주변(GET /user/stores/map/radius, 1km), 오늘 저녁 빈자리, 웨이팅 가능
 */
export function HomePage() {
  const isCustomer = useAuthStore((s) => s.member?.userType === 'CUSTOMER')
  const { data: hasUnread = false } = useHasUnreadNotification(isCustomer)
  const today = dayjs().format('YYYY-MM-DD')
  const { data: categoryData } = useCategories()
  const categories = categoryData?.length ? categoryData : FALLBACK_CATEGORIES
  // 내 주변, 인기 줄이 같은 기준 위치를 쓴다. 위치 권한이 없으면 강남역
  const geo = useGeolocation()
  const settled = geo.status !== 'idle' && geo.status !== 'pending'
  const origin = geo.position ?? (settled ? DEFAULT_CENTER : null)
  const all = useStoreSearch({})
  const tonight = useStoreSearch({ date: today, time: TONIGHT.time, partySize: TONIGHT.partySize })
  const stores = all.data ?? []
  const waitingNow = stores.filter((s) => s.waitingAvailable)
  const tonightLink = `${ROUTES.SEARCH}?date=${today}&time=${TONIGHT.time}&party=${TONIGHT.partySize}`
  const banners: Banner[] = [
    { eyebrow: '오늘 저녁 7시, 2명', title: '지금 바로 예약할 수 있는 식당', to: tonightLink, image: getCategoryPhoto('KOREAN', 1) },
    { eyebrow: '성수 카페 산책', title: '디저트가 맛있는 성수 카페', to: paths.mapAt(37.5446, 127.0559), image: getCategoryPhoto('CAFE', 2) },
    { eyebrow: '홍대 밤 한 잔', title: '퇴근 후 들르기 좋은 술집', to: paths.mapAt(37.5572, 126.9245), image: getCategoryPhoto('BAR', 7) },
    { eyebrow: '줄 서지 말고 원격 웨이팅', title: '차례가 되면 알림으로 불러드려요', to: ROUTES.STORE_MAP, image: getCategoryPhoto('JAPANESE', 0) },
  ]

  return (
    <Page>
      <header className={styles.searchWrap}>
        <h1 className="sr-only">캐치테이블</h1>
        <Logo className={styles.logo} />
        <Link to={ROUTES.SEARCH} className={styles.search}>
          <Search aria-hidden />
          <span>식당 이름으로 검색</span>
        </Link>
        <Link to={ROUTES.NOTIFICATIONS} className={styles.mapLink}>
          <Bell aria-hidden />
          <span>알림</span>
          {hasUnread && (
            <>
              <span className={styles.unreadDot} aria-hidden />
              <span className="sr-only">, 안 읽은 알림 있음</span>
            </>
          )}
        </Link>
      </header>

      <BannerCarousel banners={banners} />
      <CategoryGrid categories={categories} />

      <Divider thick />

      {all.isPending ? (
        <>
          <NearbyShelf geo={geo} origin={origin} />
          <PopularShelf origin={origin} />
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
          <NearbyShelf geo={geo} origin={origin} />
          <PopularShelf origin={origin} />
          <RegionSection regions={REGIONS} />
          <Divider thick />
          <Shelf
            title="오늘 저녁 7시, 2명 자리 있어요"
            description="지금 바로 예약할 수 있는 매장이에요"
            stores={tonight.data ?? []}
            more={tonightLink}
          />
          <CategoryBest categories={categories} />
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
function NearbyShelf({ geo, origin }: { geo: ReturnType<typeof useGeolocation>; origin: LatLng | null }) {
  const settled = geo.status !== 'idle' && geo.status !== 'pending'
  const { data, isPending, isError, refetch } = useNearbyStores(origin, NEARBY_SIZE)
  const stores = data?.stores ?? []

  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <div>
          <h2 className="t-title-18">내 주변 매장</h2>
          <p className="t-caption-13 text-tertiary">
            {geo.mocked
              ? '체험용 위치(강남역)에서 가까운 순서예요'
              : geo.position || !settled
                ? '지금 있는 곳에서 가까운 순서예요'
                : '위치를 허용하면 내 주변으로 보여드려요. 지금은 강남역 근처예요'}
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

/**
 * 요즘 인기 있는 곳 — 내 주변(1km) 매장을 최근 30일 예약(확정, 완료)과 웨이팅 입장 수가 많은 순으로
 * GET /api/user/stores/home?sort=POPULAR (점수는 서버가 10분마다 갱신). 불러오는 동안은 자리를 잡아 두고, 매장이 없으면 숨김
 */
function PopularShelf({ origin }: { origin: LatLng | null }) {
  const { data, isPending, isError } = usePopularNearbyStores(origin, NEARBY_SIZE)
  const stores = data?.stores ?? []
  if (isError || (!isPending && stores.length === 0)) return null
  return (
    <section className={styles.section} aria-busy={isPending || undefined}>
      <div className={styles.sectionHead}>
        <div>
          <h2 className="t-title-18">요즘 인기 있는 곳</h2>
          <p className="t-caption-13 text-tertiary">내 주변에서 최근 한 달 예약과 웨이팅이 많은 순서예요</p>
        </div>
      </div>
      {isPending ? (
        <ShelfSkeleton />
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
