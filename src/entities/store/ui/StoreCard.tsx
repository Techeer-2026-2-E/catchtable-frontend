import { Link } from 'react-router'
import { Badge } from '@/shared/ui'
import type { Store, StoreCategory } from '../model'
import styles from './StoreCard.module.css'

/** 매장 사진이 목록 응답에 없어서 카테고리 그림으로 자리를 채움 */
export const CATEGORY_EMOJI: Record<StoreCategory, string> = {
  KOREAN: '🍚',
  JAPANESE: '🍣',
  CHINESE: '🥟',
  WESTERN: '🍝',
  CAFE: '☕',
  BAR: '🍶',
  ETC: '🍽️',
}

interface StoreCardProps {
  store: Store
  to: string
  /** 카드 하단 추가 영역 (예약 가능 시간 등) */
  footer?: React.ReactNode
  /** compact = 가로로 넘기는 추천 줄의 작은 카드 */
  variant?: 'default' | 'compact'
}

/** 매장 카드 — StoreSummaryResponse(이름, 카테고리, 주소, 웨이팅 가능)만 표시 */
export function StoreCard({ store, to, footer, variant = 'default' }: StoreCardProps) {
  if (variant === 'compact') {
    return (
      <Link to={to} className={styles.compact}>
        <span className={styles.compactThumb} aria-hidden>
          {CATEGORY_EMOJI[store.category]}
        </span>
        <span className={`${styles.name} t-label-15`}>{store.name}</span>
        <span className="t-caption-12 text-tertiary">{store.categoryName}</span>
        <StoreTags store={store} />
      </Link>
    )
  }
  return (
    <article className={styles.card}>
      <Link to={to} className={styles.link}>
        <span className={styles.thumb} aria-hidden>
          {CATEGORY_EMOJI[store.category]}
        </span>
        <span className={styles.text}>
          <span className={`${styles.name} t-headline-16`}>{store.name}</span>
          <span className={`${styles.meta} t-caption-13 text-tertiary`}>
            {store.categoryName}, {store.address}
          </span>
          <StoreTags store={store} />
        </span>
      </Link>
      {footer}
    </article>
  )
}

/** 매장 태그 — 상태가 아니라 매장 속성 */
export function StoreTags({ store }: { store: Store }) {
  if (!store.waitingAvailable) return null
  return (
    <span className={styles.tags}>
      <Badge tone="primary">웨이팅 가능</Badge>
    </span>
  )
}
