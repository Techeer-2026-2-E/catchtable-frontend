import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { DAY_OF_WEEK_LABEL, DAYS_OF_WEEK, ReviewItem, STORE_CATEGORY_LABEL, StoreTags, toDayOfWeek } from '@/entities'
import { ReservationSheet, useAvailability } from '@/features/reservation'
import { useStoreDetail, useStoreMenus, useStoreReviews } from '@/features/store-detail'
import { paths } from '@/shared/config'
import { dayjs } from '@/shared/lib/dayjs'
import { formatPrice, formatTime } from '@/shared/lib/format'
import { Button, Divider, EmptyState, ErrorState, ImagePlaceholder, LoadingState, Page, Section, Tabs, TopBar } from '@/shared/ui'
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
      {store.imageUrl ? (
        <div className={styles.hero}>
          <TopBar transparent />
          <ImagePlaceholder src={store.imageUrl} alt={store.name} radius={0} className={styles.heroImage} />
        </div>
      ) : (
        <TopBar />
      )}

      <section className={styles.summary}>
        <p className="t-label-13 text-brand">{STORE_CATEGORY_LABEL[store.category]}</p>
        <h1 className="t-title-24">{store.name}</h1>
        <StoreTags store={store} />
        <dl className={styles.facts}>
          <dt>주소</dt>
          <dd>{store.address}</dd>
          <dt>오늘</dt>
          <dd className="tnum">
            {todayHour ? `${hhmm(todayHour.openTime)} ~ ${overnight ? '다음날 ' : ''}${hhmm(todayHour.closingTime)}` : '휴무'}
            {todayHour?.breakStartTime && todayHour.breakEndTime && (
              <span className={styles.sub}>
                쉬는 시간 {hhmm(todayHour.breakStartTime)} ~ {hhmm(todayHour.breakEndTime)}
              </span>
            )}
          </dd>
          {closedDays.length > 0 && (
            <>
              <dt>휴무</dt>
              <dd>매주 {closedDays.join(', ')}요일</dd>
            </>
          )}
        </dl>
      </section>

      <Tabs items={TABS} value={tab} onChange={setTab} fill />

      {(tab === 'home' || tab === 'info') && (
        <>
          <Section title="오늘 예약 가능 시간" action={<span className="t-caption-12 text-tertiary">2명 기준</span>}>
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
                    className={`${styles.slot} tnum`}
                    disabled={!slot.available}
                    onClick={() => setSheetOpen(true)}
                    aria-label={`${formatTime(slot.reservationStartAt)} ${slot.available ? `${slot.availableTableCount}테이블 남음` : '마감'}`}
                  >
                    <span className={styles.slotTime}>{formatTime(slot.reservationStartAt)}</span>
                    <span className={styles.slotCount}>{slot.available ? `${slot.availableTableCount}석` : '마감'}</span>
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
                  <p className="t-body-15">{menu.name}</p>
                  <p className={`${styles.price} t-label-15 tnum`}>{formatPrice(menu.price)}</p>
                  {menu.description && <p className={`${styles.menuDescription} t-caption-13 text-tertiary`}>{menu.description}</p>}
                </li>
              ))}
            </ul>
          </Section>
          <Divider thick />
        </>
      )}

      {(tab === 'home' || tab === 'review') && (
        <Section title={`리뷰 ${reviews.data?.reviewCount ?? 0}`}>
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
        openDays={openDays}
        initialDate={initialDate}
      />
    </Page>
  )
}
