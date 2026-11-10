import styles from './MapView.module.css'

/** 카카오 CustomOverlay 에 넣을 핀 DOM — 간이 지도의 핀과 같은 모양 */
export function createPinElement(label: string, selected: boolean, onClick: () => void) {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = selected ? `${styles.pin} ${styles.pinSelected}` : styles.pin
  button.setAttribute('aria-label', label)
  button.setAttribute('aria-pressed', String(selected))
  if (selected) {
    const text = document.createElement('span')
    text.className = styles.pinLabel
    text.textContent = label
    button.append(text)
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
