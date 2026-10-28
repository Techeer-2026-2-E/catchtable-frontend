import { Link } from 'react-router'
import { Badge } from '@/shared/ui'
import type { Store } from '../model'
import styles from './StoreCard.module.css'

interface StoreCardProps {
  store: Store
  to: string
  /** 카드 하단 추가 영역 (예약 가능 날짜 등) */
  footer?: React.ReactNode
}

/** 홈·검색 결과 매장 카드 — StoreSummaryResponse(이름·카테고리·주소·웨이팅 가능)만 표시 */
export function StoreCard({ store, to, footer }: StoreCardProps) {
  return (
    <article className={styles.card}>
      <Link to={to} className={styles.link}>
        <h3 className={`${styles.name} t-headline-16`}>{store.name}</h3>
        <p className="t-caption-13 text-tertiary">
          {store.categoryName} · {store.address}
        </p>
        <StoreTags store={store} />
      </Link>
      {footer}
    </article>
  )
}

/** 매장 태그 — 상태가 아니라 매장 속성이므로 brand 톤 */
export function StoreTags({ store }: { store: Store }) {
  if (!store.waitingAvailable) return null
  return (
    <div className={styles.tags}>
      <Badge tone="brand">웨이팅 가능</Badge>
    </div>
  )
}
