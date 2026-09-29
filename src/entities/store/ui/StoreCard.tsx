import { Heart } from 'lucide-react'
import { Link } from 'react-router'
import { formatPrice } from '@/shared/lib/format'
import { Badge, ImagePlaceholder, Rating } from '@/shared/ui'
import { STORE_CATEGORY_LABEL, type Store } from '../model'
import styles from './StoreCard.module.css'

interface StoreCardProps {
  store: Store
  to: string
  /** 카드 하단 추가 영역 (예약 가능 날짜 등) */
  footer?: React.ReactNode
  /** compact=가로 스크롤용 작은 카드 */
  variant?: 'default' | 'compact'
}

/** 홈·검색 결과 매장 카드. 이미지 180 · 이름 · 평점/카테고리/지역 · 태그 */
export function StoreCard({ store, to, footer, variant = 'default' }: StoreCardProps) {
  const meta = [STORE_CATEGORY_LABEL[store.category], store.region].filter(Boolean).join(' · ')

  return (
    <article className={variant === 'compact' ? styles.compact : styles.card}>
      <Link to={to} className={styles.link}>
        <ImagePlaceholder src={store.thumbnailUrl} alt={store.name} className={styles.image} />
        <div className={styles.body}>
          <h3 className={`${styles.name} t-headline-16`}>{store.name}</h3>
          <div className={styles.meta}>
            {store.rating != null && <Rating value={store.rating} count={store.reviewCount} />}
            <span className="t-caption-13 text-tertiary">{meta}</span>
          </div>
          {variant === 'default' && store.priceRange && (
            <p className="t-caption-13 text-tertiary">
              {store.priceRange}
              {store.maxPartySize && ` · 최대 ${store.maxPartySize}명`}
            </p>
          )}
          <StoreTags store={store} />
        </div>
      </Link>
      {variant === 'default' && (
        <button type="button" className={styles.like} aria-label={`${store.name} 저장`}>
          <Heart />
        </button>
      )}
      {footer}
    </article>
  )
}

/** 매장 태그 — 상태가 아니라 매장 속성이므로 brand 톤 */
export function StoreTags({ store }: { store: Store }) {
  const tags: { label: string; tone: 'brand' | 'primary' }[] = []
  if (store.depositAmount === 0) tags.push({ label: '예약금 0원', tone: 'brand' })
  else if (store.depositAmount) tags.push({ label: `예약금 ${formatPrice(store.depositAmount)}`, tone: 'brand' })
  if (store.waitingAvailable) {
    tags.push({ label: store.waitingTeams ? `웨이팅 ${store.waitingTeams}팀` : '바로 입장', tone: 'brand' })
  }
  if (tags.length === 0) return null

  return (
    <div className={styles.tags}>
      {tags.map((t) => (
        <Badge key={t.label} tone={t.tone}>
          {t.label}
        </Badge>
      ))}
    </div>
  )
}
