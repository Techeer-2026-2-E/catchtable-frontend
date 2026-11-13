import { useRef, useState } from 'react'
import { MapPin } from 'lucide-react'
import { Link } from 'react-router'
import { getStorePhotos, type StoreDetail } from '@/entities'
import { paths } from '@/shared/config'
import { cn } from '@/shared/lib/cn'
import { MapView } from '@/shared/ui/map'
import styles from './StorePhotoCarousel.module.css'

const noop = () => {}

/**
 * 매장 상세 맨 위 — 사진을 옆으로 넘기고, 마지막 장은 매장 위치 지도
 * 지도 장을 누르면 이 매장을 가운데 둔 지도 검색(/map)으로 간다
 * 사진은 실제 사진(imageUrl) 다음에 카테고리 목 사진을 이어 붙인다
 */
export function StorePhotoCarousel({ store, className }: { store: StoreDetail; className?: string }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const photos = getStorePhotos(store)
  const hasMap = store.latitude != null && store.longitude != null
  const total = photos.length + (hasMap ? 1 : 0)
  const onMap = hasMap && index === photos.length

  const onScroll = () => {
    const el = trackRef.current
    if (!el || !el.clientWidth) return
    setIndex(Math.round(el.scrollLeft / el.clientWidth))
  }

  return (
    <div className={cn(styles.root, className)}>
      <div ref={trackRef} className={styles.track} onScroll={onScroll} aria-label={`${store.name} 사진과 위치`} role="region">
        {photos.map((src, i) => (
          <div key={src} className={styles.slide}>
            <img
              src={src}
              alt={store.imageUrl && i === 0 ? store.name : ''}
              loading={i === 0 ? 'eager' : 'lazy'}
              className={styles.photo}
            />
          </div>
        ))}
        {hasMap && (
          <div className={styles.slide}>
            <MapView
              initialCenter={{ lat: store.latitude!, lng: store.longitude! }}
              pins={[{ id: store.id, lat: store.latitude!, lng: store.longitude!, label: store.name, selected: true }]}
              onIdle={noop}
              onPinClick={noop}
              className={styles.map}
            />
            {/* 지도는 움직이지 않고, 누르면 지도 검색으로 — 위에 덮은 링크가 터치를 받는다 */}
            <Link to={paths.storeOnMap(store.id, store.latitude!, store.longitude!)} className={styles.mapLink}>
              <span className={`${styles.mapCta} t-label-13`}>
                <MapPin aria-hidden />
                지도에서 주변 매장 보기
              </span>
            </Link>
          </div>
        )}
      </div>
      {total > 1 && !onMap && (
        <span className={`${styles.counter} t-caption-12 tnum`} aria-hidden>
          {index + 1} / {photos.length}
          {hasMap && <span className={styles.mapHint}> · 넘기면 지도</span>}
        </span>
      )}
    </div>
  )
}
