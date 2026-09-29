import { useState } from 'react'
import { Clock, Heart, MapPin, Share2, Users, Wallet } from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import { STORE_CATEGORY_LABEL, StoreTags } from '@/entities'
import { findMockStore, MOCK_BUSINESS_HOURS, MOCK_MENUS, MOCK_TIME_SLOTS } from '@/entities/mock'
import { paths } from '@/shared/config'
import { dayjs } from '@/shared/lib/dayjs'
import { formatPrice, formatTime } from '@/shared/lib/format'
import {
  Avatar,
  Button,
  Divider,
  IconButton,
  ImagePlaceholder,
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

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']

// TODO(API 연동): 리뷰 조회 API (P2)
const MOCK_REVIEWS = [
  { id: 1, author: '맛집탐방러', rating: 5, content: '분위기도 좋고 맛도 최고예요! 재방문 의사 있습니다.', date: '3일 전' },
  { id: 2, author: '혼밥러', rating: 4, content: '웨이팅 없이 바로 입장했어요. 코스 구성이 알차요.', date: '1주 전' },
]

export function StoreDetailPage() {
  const { storeId } = useParams<{ storeId: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('home')
  const [liked, setLiked] = useState(false)

  // TODO(API 연동): useStoreDetail(storeId), useStoreMenus(storeId), useAvailability(storeId, today)
  const store = findMockStore(storeId)
  const todayHour = MOCK_BUSINESS_HOURS.find((h) => h.dayOfWeek === dayjs().day())
  const closedDays = MOCK_BUSINESS_HOURS.filter((h) => h.closed).map((h) => WEEKDAY[h.dayOfWeek])

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
          <Button className={styles.cta} onClick={() => navigate(paths.reservation(store.id))}>
            예약하기
          </Button>
        </>
      }
    >
      <div className={styles.hero}>
        <TopBar
          transparent
          actions={<IconButton label="공유" icon={<Share2 />} onClick={() => toast('링크를 복사했어요')} />}
        />
        <ImagePlaceholder src={store.thumbnailUrl} alt={store.name} radius={0} className={styles.heroImage} />
      </div>

      <section className={styles.summary}>
        <h1 className="t-title-20">{store.name}</h1>
        <div className={styles.meta}>
          {store.rating != null && <Rating value={store.rating} count={store.reviewCount} />}
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
              {todayHour && !todayHour.closed
                ? `오늘 ${todayHour.openTime}~${todayHour.closeTime}`
                : '오늘 휴무'}
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
            <div className={styles.slots}>
              {MOCK_TIME_SLOTS.map((slot) => (
                <button
                  key={slot.time}
                  type="button"
                  className={styles.slot}
                  disabled={!slot.available}
                  onClick={() => navigate(paths.reservation(store.id))}
                >
                  <span className="t-label-13">{formatTime(slot.time)}</span>
                  <span className="t-caption-12">
                    {slot.available ? `${slot.remainingTables}테이블 남음` : '마감'}
                  </span>
                </button>
              ))}
            </div>
          </Section>
          <Divider thick />
        </>
      )}

      {(tab === 'home' || tab === 'menu') && (
        <>
          <Section title="메뉴">
            <ul className={styles.menuList}>
              {MOCK_MENUS.map((menu) => (
                <li key={menu.id} className={styles.menu}>
                  <div>
                    <p className="t-body-14-strong">{menu.name}</p>
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
        <Section title={`리뷰 ${store.reviewCount ?? 0}`}>
          <ul className={styles.reviews}>
            {MOCK_REVIEWS.map((review) => (
              <li key={review.id} className={styles.review}>
                <Avatar name={review.author} size={32} />
                <div>
                  <p className="t-caption-13">
                    <strong>{review.author}</strong>
                    <span className="text-tertiary"> · {review.date}</span>
                  </p>
                  <Rating value={review.rating} />
                  <p className="t-body-14">{review.content}</p>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </Page>
  )
}
