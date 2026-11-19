/** 목 사진 썸네일 폭 — scripts/generate-thumbs.mjs 의 WIDTHS 와 같아야 함 */
export const THUMB_WIDTHS = [240, 480] as const

/** 원본(800×600) 목 사진 경로 — 이 경로만 작은 변형이 있다 */
const MOCK_PHOTO = /^\/images\/stores\/photos\/([a-z]+-\d+)\.webp$/

/**
 * 화면 크기에 맞는 사진만 받도록 srcset 을 만든다 (img 의 sizes 와 함께 사용)
 * 작은 변형이 있는 목 사진만 해당 — 백엔드가 준 실제 사진 주소는 undefined (원본 그대로)
 */
export function responsiveSrcSet(src: string | undefined): string | undefined {
  const match = src ? MOCK_PHOTO.exec(src) : null
  if (!match) return undefined
  const thumbs = THUMB_WIDTHS.map((w) => `/images/stores/photos/thumbs/${match[1]}-${w}.webp ${w}w`)
  return [...thumbs, `${src} 800w`].join(', ')
}
