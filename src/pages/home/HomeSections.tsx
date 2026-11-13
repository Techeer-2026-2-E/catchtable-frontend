import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronRight, MapPin } from 'lucide-react'
import { Link } from 'react-router'
import { CategoryIcon, getStoreImageSrc, type Category, type LatLng, type MapStore, type StoreCategory } from '@/entities'
import { useNearbyStores } from '@/features/store-map'
import { paths, ROUTES } from '@/shared/config'
import { cn } from '@/shared/lib/cn'
import { Chip, ChipGroup, ImagePlaceholder, Rating, ShelfSkeleton, Skeleton } from '@/shared/ui'
import styles from './HomePage.module.css'

/* ------------------------------------------------------------------ */
/* 맨 위 배너 — 자동으로 넘어가고 손으로도 넘긴다                         */
/* ------------------------------------------------------------------ */

export interface Banner {
  eyebrow: string
  title: string
  to: string
  image: string
}

const BANNER_INTERVAL_MS = 4500

export function BannerCarousel({ banners }: { banners: Banner[] }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const paused = useRef(false)

  useEffect(() => {
    const timer = window.setInterval(() => {
      const el = trackRef.current
      if (!el || paused.current || document.hidden) return
      const next = (Math.round(el.scrollLeft / el.clientWidth) + 1) % banners.length
      el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' })
    }, BANNER_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [banners.length])

  const onScroll = () => {
    const el = trackRef.current
    if (el?.clientWidth) setIndex(Math.round(el.scrollLeft / el.clientWidth))
  }

  return (
    <section className={styles.bannerWrap} aria-label="추천 모음">
      <div
        ref={trackRef}
        className={styles.bannerTrack}
        onScroll={onScroll}
        onPointerEnter={() => (paused.current = true)}
        onPointerLeave={() => (paused.current = false)}
        onTouchStart={() => (paused.current = true)}
        onTouchEnd={() => (paused.current = false)}
      >
        {banners.map((b) => (
          <Link key={b.title} to={b.to} className={styles.banner}>
            <img src={b.image} alt="" className={styles.bannerImage} />
            <span className={styles.bannerShade} aria-hidden />
            <span className={styles.bannerText}>
              <span className="t-label-13">{b.eyebrow}</span>
              <span className={cn(styles.bannerTitle, 't-title-20')}>{b.title}</span>
            </span>
          </Link>
        ))}
      </div>
      <span className={cn(styles.bannerCounter, 't-caption-12 tnum')} aria-hidden>
        {index + 1} / {banners.length}
      </span>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* 음식 종류 바로가기 — 직접 그린 선 아이콘 격자                           */
/* ------------------------------------------------------------------ */

export function CategoryGrid({ categories }: { categories: Category[] }) {
  return (
    <nav className={styles.categoryGrid} aria-label="음식 종류">
      {categories.map(({ code, name }) => (
        <Link key={code} to={`${ROUTES.SEARCH}?category=${code}`} className={styles.categoryTile}>
          <span className={styles.categoryIcon}>
            <CategoryIcon category={code} />
          </span>
          <span className="t-caption-12">{name}</span>
        </Link>
      ))}
      <Link to={ROUTES.STORE_MAP} className={styles.categoryTile}>
        <span className={styles.categoryIcon}>
          <MapPin aria-hidden />
        </span>
        <span className="t-caption-12">지도</span>
      </Link>
    </nav>
  )
}

/* ------------------------------------------------------------------ */
/* 지역 — 고른 지역 근처 입점 매장을 큰 카드로                              */
/* ------------------------------------------------------------------ */

export interface Region {
  name: string
  center: LatLng
}

/** 주변 조회 한 번에 받을 매장 수 — 이 중 입점 매장을 앞에 세운다 */
const REGION_FETCH_SIZE = 30

/** 입점(예약 가능) 매장 먼저, 그다음 별점 높은 순 */
const byRecommendation = (a: MapStore, b: MapStore) =>
  Number(b.reservationEnabled) - Number(a.reservationEnabled) || (b.ratingAverage ?? 0) - (a.ratingAverage ?? 0)

export function RegionSection({ regions }: { regions: Region[] }) {
  const [selected, setSelected] = useState(0)
  const region = regions[selected]
  const { data, isPending } = useNearbyStores(region.center, REGION_FETCH_SIZE)
  const stores = useMemo(() => [...(data?.stores ?? [])].sort(byRecommendation).slice(0, 8), [data])

  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <div>
          <h2 className="t-title-18">어디서 만날까요?</h2>
          <p className="t-caption-13 text-tertiary">지역을 고르면 근처에서 예약할 수 있는 곳부터 보여드려요</p>
        </div>
        <Link to={paths.mapAt(region.center.lat, region.center.lng)} className={`${styles.more} t-body-14`}>
          지도
          <ChevronRight aria-hidden />
        </Link>
      </div>
      <div className={styles.chipRow}>
        <ChipGroup label="지역" scroll>
          {regions.map((r, i) => (
            <Chip key={r.name} selected={i === selected} onClick={() => setSelected(i)}>
              {r.name}
            </Chip>
          ))}
        </ChipGroup>
      </div>
      {isPending ? (
        <ShelfSkeleton />
      ) : stores.length === 0 ? (
        <p className={`${styles.shelfEmpty} t-body-14 text-tertiary`}>이 지역에는 아직 매장이 없어요</p>
      ) : (
        <ul className={styles.shelf}>
          {stores.map((store) => (
            <li key={store.id}>
              <WideStoreCard store={store} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** 큰 사진 카드 — 지역 추천 줄 */
function WideStoreCard({ store }: { store: MapStore }) {
  const meta = [store.area, store.categoryName].filter(Boolean).join(', ')
  return (
    <Link to={paths.storeDetail(store.id)} className={styles.wideCard}>
      <ImagePlaceholder src={getStoreImageSrc(store)} className={styles.wideThumb} radius={16} />
      <span className={cn(styles.wideName, 't-headline-16')}>{store.name}</span>
      <span className={styles.wideMeta}>
        {store.ratingAverage != null && <Rating value={store.ratingAverage} count={store.reviewCount} />}
        <span className="t-caption-13 text-tertiary">{meta}</span>
      </span>
      {(store.reservationEnabled || store.waitingAvailable) && (
        <span className={styles.tags}>
          {store.reservationEnabled && <span className="t-label-13 text-brand">예약 가능</span>}
          {store.waitingAvailable && <span className="t-label-13 text-brand">웨이팅 가능</span>}
        </span>
      )}
    </Link>
  )
}

/* ------------------------------------------------------------------ */
/* 음식 종류별 BEST — 여러 지역의 입점 매장을 모아 별점 순위                */
/* ------------------------------------------------------------------ */

const RANK_SIZE = 5

export function CategoryBest({ regions, categories }: { regions: Region[]; categories: Category[] }) {
  // 지역 바로가기와 같은 조회를 함께 써서 요청이 늘지 않게 (같은 키)
  const a = useNearbyStores(regions[0]?.center ?? null, REGION_FETCH_SIZE)
  const b = useNearbyStores(regions[1]?.center ?? null, REGION_FETCH_SIZE)
  const c = useNearbyStores(regions[2]?.center ?? null, REGION_FETCH_SIZE)
  const pool = useMemo(() => {
    const byId = new Map<number, MapStore>()
    for (const s of [...(a.data?.stores ?? []), ...(b.data?.stores ?? []), ...(c.data?.stores ?? [])]) {
      if (s.reservationEnabled && s.reviewCount > 0) byId.set(s.id, s)
    }
    return [...byId.values()]
  }, [a.data, b.data, c.data])

  // 순위를 만들 수 있는 음식 종류만 탭으로
  const tabs = categories.filter((cat) => pool.some((s) => s.categoryName === cat.name))
  const [picked, setPicked] = useState<StoreCategory | null>(null)
  const current = tabs.find((t) => t.code === picked) ?? tabs[0]
  const ranked = current
    ? pool
        .filter((s) => s.categoryName === current.name)
        .sort((x, y) => (y.ratingAverage ?? 0) - (x.ratingAverage ?? 0) || y.reviewCount - x.reviewCount)
        .slice(0, RANK_SIZE)
    : []
  const loading = a.isPending || b.isPending || c.isPending

  if (!loading && tabs.length === 0) return null
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <div>
          <h2 className="t-title-18">음식 종류별 BEST</h2>
          <p className="t-caption-13 text-tertiary">다녀온 분들의 별점이 높은 순서예요</p>
        </div>
      </div>
      {loading ? (
        <div className={styles.rankList}>
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} height={64} />
          ))}
        </div>
      ) : (
        <>
          <div className={styles.chipRow}>
            <ChipGroup label="음식 종류" scroll>
              {tabs.map((t) => (
                <Chip key={t.code} selected={t.code === current?.code} onClick={() => setPicked(t.code)}>
                  {t.name}
                </Chip>
              ))}
            </ChipGroup>
          </div>
          <ol className={styles.rankList}>
            {ranked.map((store, i) => (
              <li key={store.id}>
                <Link to={paths.storeDetail(store.id)} className={styles.rankItem}>
                  <span className={cn(styles.rankNo, i < 3 && styles.rankTop, 't-title-18 tnum')}>{i + 1}</span>
                  <ImagePlaceholder src={getStoreImageSrc(store)} className={styles.rankThumb} radius={8} />
                  <span className={styles.rankText}>
                    <span className="t-headline-16">{store.name}</span>
                    <span className={styles.wideMeta}>
                      {store.ratingAverage != null && <Rating value={store.ratingAverage} count={store.reviewCount} />}
                      {store.area && <span className="t-caption-13 text-tertiary">{store.area}</span>}
                    </span>
                  </span>
                  <ChevronRight aria-hidden className={styles.rankChevron} />
                </Link>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  )
}
