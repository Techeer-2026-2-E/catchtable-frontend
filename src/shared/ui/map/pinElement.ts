import styles from './MapView.module.css'
import { pinLook } from './pinLook'
import type { MapPin } from './types'

/** 카카오 CustomOverlay 에 넣을 핀 DOM — 간이 지도의 핀과 같은 모양 */
export function createPinElement(pin: MapPin, onClick: () => void) {
  const look = pinLook(pin)
  const button = document.createElement('button')
  button.type = 'button'
  button.className = look.className
  button.setAttribute('aria-label', look.ariaLabel)
  button.setAttribute('aria-pressed', String(!!pin.selected))
  if (look.showLabel) {
    const text = document.createElement('span')
    text.className = styles.pinLabel
    text.textContent = pin.label
    button.append(text)
  }
  if (look.rating) {
    const rating = document.createElement('span')
    rating.className = styles.pinRating
    rating.setAttribute('aria-hidden', 'true')
    const star = document.createElement('span')
    star.className = styles.pinStar
    star.textContent = '★'
    rating.append(star, look.rating)
    button.append(rating)
  }
  button.addEventListener('click', (e) => {
    e.stopPropagation()
    onClick()
  })
  return button
}

export function createMyLocationElement() {
  const dot = document.createElement('span')
  dot.className = styles.me
  dot.setAttribute('aria-label', '내 위치')
  return dot
}
