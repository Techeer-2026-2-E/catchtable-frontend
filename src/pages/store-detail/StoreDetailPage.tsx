import { useState } from 'react'
import { Clock, Heart, MapPin, Share2, Users, Wallet } from 'lucide-react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { DAY_OF_WEEK_LABEL, DAYS_OF_WEEK, ReviewItem, STORE_CATEGORY_LABEL, StoreTags, toDayOfWeek } from '@/entities'
import { ReservationSheet, useAvailability } from '@/features/reservation'
import { useStoreDetail, useStoreMenus, useStoreReviews } from '@/features/store-detail'
import { paths } from '@/shared/config'
import { dayjs } from '@/shared/lib/dayjs'
import { formatPrice, formatTime } from '@/shared/lib/format'
import {
  Badge,
  Button,
  Divider,
  EmptyState,
  ErrorState,
  IconButton,
  ImagePlaceholder,
  LoadingState,
  Page,
  Rating,
  Section,
  Tabs,
  toast,
  TopBar,
} from '@/shared/ui'
import styles from './StoreDetailPage.module.css'

type Tab = 'home' | 'menu' | 'review' | 'info'
const TABS: { value: Tab; label: string }[] = [
  { value: 'home', label: '홈' },
  { value: 'menu', label: '메뉴' },
  { value: 'review', label: '리뷰' },
  { value: 'info', label: '매장정보' },
]

/** "18:00:00" → "18:00" */
const hhmm = (t: string) => t.slice(0, 5)

export function StoreDetailPage() {
  const { storeId } = useParams<{ storeId: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('home')
  const [liked, setLiked] = useState(false)
  const [searchParams] = useSearchParams()
  const initialDate = searchParams.get('date')
  // 검색 결과에서 날짜를 눌러 들어오면 예약 시트를 바로 연다
  const [sheetOpen, setSheetOpen] = useState(!!initialDate)

  const id = Number(storeId)
  const { data: store, isPending, isError, refetch } = useStoreDetail(id)
  const menus = useStoreMenus(id)
  const reviews = useStoreReviews(id)
  const today = dayjs().format('YYYY-MM-DD')
  const todaySlots = useAvailability(id, today, 2)

  if (isPending) {
    return (
      <Page>
        <TopBar />
        <LoadingState />
      </Page>
    )
  }
  if (isError) {
    return (
      <Page>
        <TopBar />
        <ErrorState message="매장 정보를 불러오지 못했어요" onRetry={() => refetch()} />
      </Page>
    )
  }

  const todayHour = store.businessHours.find((h) => h.dayOfWeek === toDayOfWeek(dayjs().day()))
  const openDays = store.businessHours.map((h) => h.dayOfWeek)
  const closedDays = DAYS_OF_WEEK.filter((d) => !openDays.includes(d)).map((d) => DAY_OF_WEEK_LABEL[d])
  const overnight = todayHour && todayHour.closingTime <= todayHour.openTime
  const openSlots = todaySlots.data?.slots ?? []

  return (
    <Page
      bottom={
        <>
          <IconButton
            label={liked ? '저장 취소' : '저장'}
            icon={<Heart fill={liked ? 'currentColor' : 'none'} />}
            variant="outline"
            className={liked ? styles.liked : undefined}
            onClick={() => {
              setLiked(!liked)
              toast(liked ? '저장을 취소했어요' : '저장 목록에 추가했어요')
            }}
          />
          {store.waitingAvailable && (
            <Button variant="soft" className={styles.cta} onClick={() => navigate(paths.waitingApply(store.id))}>
              웨이팅 신청
            </Button>
          )}
          <Button className={styles.cta} onClick={() => setSheetOpen(true)}>
            예약하기
          </Button>
        </>
      }
    >
      <div className={styles.hero}>
        <TopBar transparent actions={<IconButton label="공유" icon={<Share2 />} onClick={() => toast('링크를 복사했어요')} />} />
        <ImagePlaceholder src={store.thumbnailUrl} alt={store.name} radius={0} className={styles.heroImage} />
      </div>

      <section className={styles.summary}>
        <h1 className="t-title-20">{store.name}</h1>
        <div className={styles.meta}>
          {!!store.reviewCount && <Rating value={store.rating ?? 0} count={store.reviewCount} />}
          <span className="t-caption-13 text-tertiary">
            {[store.region, STORE_CATEGORY_LABEL[store.category]].filter(Boolean).join(' · ')}
          </span>
        </div>

        <ul className={styles.infoList}>
          <li>
            <MapPin aria-hidden />
            <span>{store.address}</span>
          </li>
          <li>
            <Clock aria-hidden />
            <span>
              {todayHour ? `오늘 ${hhmm(todayHour.openTime)}~${overnight ? '익일 ' : ''}${hhmm(todayHour.closingTime)}` : '오늘 휴무'}
              {todayHour?.breakStartTime && todayHour.breakEndTime && (
                <span className="text-tertiary">
                  {' '}
                  · 브레이크 {hhmm(todayHour.breakStartTime)}~{hhmm(todayHour.breakEndTime)}
                </span>
              )}
              {closedDays.length > 0 && <span className="text-tertiary"> · {closedDays.join('·')} 휴무</span>}
            </span>
          </li>
          {store.priceRange && (
            <li>
              <Wallet aria-hidden />
              <span>{store.priceRange}</span>
            </li>
          )}
          {store.maxPartySize && (
            <li>
              <Users aria-hidden />
              <span>최대 {store.maxPartySize}명 예약 가능</span>
            </li>
          )}
        </ul>
        <StoreTags store={store} />
      </section>

      <Tabs items={TABS} value={tab} onChange={setTab} fill />

      {(tab === 'home' || tab === 'info') && (
        <>
          <Section title="오늘 예약 가능 시간">
            {todaySlots.isPending ? (
              <LoadingState compact />
            ) : openSlots.length === 0 ? (
              <p className="t-caption-13 text-tertiary">오늘은 예약 가능한 시간이 없어요</p>
            ) : (
              <div className={styles.slots}>
                {openSlots.map((slot) => (
                  <button
                    key={slot.reservationStartAt}
                    type="button"
                    className={styles.slot}
                    disabled={!slot.available}
                    onClick={() => setSheetOpen(true)}
                  >
                    <span className="t-label-13">{formatTime(slot.reservationStartAt)}</span>
                    <span className="t-caption-12">{slot.available ? `${slot.availableTableCount}테이블 남음` : '마감'}</span>
                  </button>
                ))}
              </div>
            )}
          </Section>
          <Divider thick />
        </>
      )}

      {(tab === 'home' || tab === 'menu') && (
        <>
          <Section title="메뉴">
            {menus.isPending && <LoadingState compact />}
            {menus.data?.length === 0 && <p className="t-caption-13 text-tertiary">등록된 메뉴가 없어요</p>}
            <ul className={styles.menuList}>
              {menus.data?.map((menu) => (
                <li key={menu.id} className={styles.menu}>
                  <div>
                    <p className="t-body-14-strong">
                      {menu.name}
                      {menu.soldOut && <Badge className={styles.soldOut}>품절</Badge>}
                    </p>
                    {menu.description && <p className="t-caption-13 text-tertiary">{menu.description}</p>}
                    <p className="t-label-13">{formatPrice(menu.price)}</p>
                  </div>
                  <ImagePlaceholder src={menu.imageUrl} className={styles.menuImage} radius={8} />
                </li>
              ))}
            </ul>
          </Section>
          <Divider thick />
        </>
      )}

      {(tab === 'home' || tab === 'review') && (
        <Section title={`리뷰 ${reviews.data?.reviewCount ?? store.reviewCount ?? 0}`}>
          {reviews.isPending ? (
            <LoadingState compact />
          ) : !reviews.data?.reviews.length ? (
            <EmptyState title="아직 리뷰가 없어요" />
          ) : (
            <ul className={styles.reviews}>
              {(tab === 'home' ? reviews.data.reviews.slice(0, 3) : reviews.data.reviews).map((review) => (
                <li key={review.reviewId}>
                  <ReviewItem review={review} />
                </li>
              ))}
            </ul>
          )}
          {tab === 'home' && (reviews.data?.reviews.length ?? 0) > 3 && (
            <Button variant="outline" size="M" fullWidth onClick={() => setTab('review')}>
              리뷰 전체보기
            </Button>
          )}
        </Section>
      )}

      <ReservationSheet
        storeId={store.id}
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        maxPartySize={store.maxPartySize}
        openDays={openDays}
        initialDate={initialDate}
      />
    </Page>
  )
}
