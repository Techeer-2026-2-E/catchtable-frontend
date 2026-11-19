import styles from './MapView.module.css'
import type { MapPin } from './types'

/** 핀 하나를 어떻게 그릴지 — 간이 지도(JSX)와 카카오 오버레이(DOM)가 같이 쓴다 */
export function pinLook(pin: MapPin) {
  const featured = !!pin.featured
  const rating = featured && pin.rating != null ? pin.rating.toFixed(1) : null
  return {
    featured,
    /** 이름을 보여줄지 — 박스이거나 선택했을 때 */
    showLabel: featured || !!pin.selected,
    rating,
    className: [styles.pin, featured && styles.pinFeatured, pin.selected && styles.pinSelected].filter(Boolean).join(' '),
    ariaLabel: rating ? `${pin.label}, 별점 ${rating}` : pin.label,
    /** 선택한 핀이 맨 위, 그다음 순위가 높은 핀 */
    zIndex: pin.selected ? 1000 : pin.rank != null ? 100 - pin.rank : 1,
    /** 아래 끝을 지점에 맞출지 (박스, 선택 말풍선). 아니면 가운데 */
    anchorBottom: featured || !!pin.selected,
  }
}
