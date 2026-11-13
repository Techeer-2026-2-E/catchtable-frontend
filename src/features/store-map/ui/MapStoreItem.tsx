import { Link } from 'react-router'
import { getStoreImageSrc, type MapStore } from '@/entities'
import { cn } from '@/shared/lib/cn'
import { ImagePlaceholder, Rating } from '@/shared/ui'
import { formatDistance } from '../lib/geo'
import { describeOpenStatus } from '../lib/openStatus'
import styles from './MapStoreItem.module.css'

interface MapStoreItemProps {
  store: MapStore
  to: string
  /** card = 지도 위에 뜨는 선택 매장 카드 (그림자, 둥근 모서리) */
  variant?: 'row' | 'card'
}

/** 지도 검색 결과 한 칸 — 사진, 이름, 평점, 지역과 음식 종류, 영업 상태와 거리, 예약/웨이팅 (없는 값은 줄째 숨김, 와이어프레임 MapStoreItem) */
export function MapStoreItem({ store, to, variant = 'row' }: MapStoreItemProps) {
  const open = describeOpenStatus(store)
  const distance = formatDistance(store.distanceMeters)
  const meta = [store.area, store.categoryName].filter(Boolean).join(', ')
  return (
    <Link to={to} className={cn(styles.item, variant === 'card' && styles.card)}>
      <ImagePlaceholder src={getStoreImageSrc(store)} className={styles.thumb} radius={8} />
      <span className={styles.text}>
        <span className={`${styles.name} t-headline-16`}>{store.name}</span>
        <span className={styles.line}>
          {store.ratingAverage != null && <Rating value={store.ratingAverage} count={store.reviewCount} />}
          {meta && <span className="t-caption-13 text-secondary">{meta}</span>}
        </span>
        {(open || distance) && (
          <span className={`${styles.line} t-caption-13`}>
            {open && (
              <>
                <span className={open.open ? styles.open : styles.closed}>{open.label}</span>
                {open.detail && <span className="text-secondary">{open.detail}</span>}
              </>
            )}
            {distance && <span className="text-tertiary">{distance}</span>}
          </span>
        )}
        {(store.reservationEnabled || store.waitingAvailable) && (
          <span className={styles.tags}>
            {store.reservationEnabled && <span className="t-label-13 text-brand">예약 가능</span>}
            {store.waitingAvailable && <span className="t-label-13 text-brand">웨이팅 가능</span>}
          </span>
        )}
      </span>
    </Link>
  )
}
