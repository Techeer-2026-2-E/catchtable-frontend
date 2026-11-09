import { Link } from 'react-router'
import { ImagePlaceholder } from '@/shared/ui'
import type { Store } from '../model'
import styles from './StoreCard.module.css'

interface StoreCardProps {
  store: Store
  to: string
  /** 카드 하단 추가 영역 (예약 가능 시간 등) */
  footer?: React.ReactNode
  /** compact = 가로로 넘기는 추천 줄의 작은 카드 */
  variant?: 'default' | 'compact'
}

/** 매장 카드 — 대표 사진 1장, 이름, 카테고리와 주소, 웨이팅 가능 여부 */
export function StoreCard({ store, to, footer, variant = 'default' }: StoreCardProps) {
  const photo = store.imageUrl ?? undefined
  if (variant === 'compact') {
    return (
      <Link to={to} className={styles.compact}>
        <ImagePlaceholder src={photo} className={styles.compactThumb} radius={16} />
        <span className={`${styles.name} t-label-15`}>{store.name}</span>
        <span className="t-caption-12 text-tertiary">{store.categoryName}</span>
        <StoreTags store={store} />
      </Link>
    )
  }
  return (
    <article className={styles.card}>
      <Link to={to} className={styles.link}>
        <ImagePlaceholder src={photo} className={styles.thumb} radius={12} />
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

/** 매장 태그 — 상자 없이 글씨로만 표시 */
export function StoreTags({ store }: { store: Store }) {
  if (!store.waitingAvailable) return null
  return (
    <span className={styles.tags}>
      <span className="t-label-13 text-brand">웨이팅 가능</span>
    </span>
  )
}
