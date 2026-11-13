import { Link } from 'react-router'
import { ImagePlaceholder } from '@/shared/ui'
import { getStoreImageSrc } from '../image'
import type { Store } from '../model'
import styles from './StoreCard.module.css'

/** 카드에 필요한 값만 — 지도 매장(MapStore)처럼 주소가 없는 응답도 compact 로 그릴 수 있게 */
export type StoreCardData = Pick<Store, 'name' | 'categoryName' | 'waitingAvailable' | 'imageUrl'> &
  Partial<Pick<Store, 'id' | 'category'>> & { address?: string }

interface StoreCardProps {
  store: StoreCardData
  to: string
  /** 카드 하단 추가 영역 (예약 가능 시간 등) */
  footer?: React.ReactNode
  /** compact = 가로로 넘기는 추천 줄의 작은 카드 */
  variant?: 'default' | 'compact'
  /** compact 카드 두 번째 줄 — 기본은 음식 종류 (예: "주점, 90m") */
  meta?: string
}

/** 매장 카드 — 대표 사진 1장, 이름, 카테고리와 주소, 웨이팅 가능 여부 */
export function StoreCard({ store, to, footer, variant = 'default', meta }: StoreCardProps) {
  const photo = getStoreImageSrc(store)
  if (variant === 'compact') {
    return (
      <Link to={to} className={styles.compact}>
        <ImagePlaceholder src={photo} className={styles.compactThumb} radius={16} />
        <span className={`${styles.name} t-label-15`}>{store.name}</span>
        <span className="t-caption-12 text-tertiary">{meta ?? store.categoryName}</span>
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
            {store.address ? `${store.categoryName}, ${store.address}` : store.categoryName}
          </span>
          <StoreTags store={store} />
        </span>
      </Link>
      {footer}
    </article>
  )
}

/** 매장 태그 — 상자 없이 글씨로만 표시 */
export function StoreTags({ store }: { store: Pick<Store, 'waitingAvailable'> }) {
  if (!store.waitingAvailable) return null
  return (
    <span className={styles.tags}>
      <span className="t-label-13 text-brand">웨이팅 가능</span>
    </span>
  )
}
