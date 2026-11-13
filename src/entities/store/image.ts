import { STORE_CATEGORY_LABEL, type StoreCategory } from './model'

/** 카테고리별 기본 이미지 — 사진이 없는 매장(공공데이터 미입점 매장 등)에 대신 보여줌 (public/images/stores) */
const CATEGORY_IMAGE: Record<StoreCategory, string> = {
  KOREAN: '/images/stores/korean.svg',
  JAPANESE: '/images/stores/japanese.svg',
  CHINESE: '/images/stores/chinese.svg',
  WESTERN: '/images/stores/western.svg',
  CAFE: '/images/stores/cafe.svg',
  BAR: '/images/stores/bar.svg',
  ETC: '/images/stores/etc.svg',
}

const CATEGORY_BY_LABEL = Object.fromEntries(
  Object.entries(STORE_CATEGORY_LABEL).map(([code, label]) => [label, code as StoreCategory]),
) as Record<string, StoreCategory>

interface StoreImageSource {
  imageUrl: string | null
  category?: StoreCategory
  /** 지도 응답처럼 category 코드가 없을 때 이름("한식")으로 찾음 */
  categoryName?: string
}

/** 매장 대표 사진. 없으면 카테고리 기본 이미지 */
export function getStoreImageSrc(store: StoreImageSource): string {
  if (store.imageUrl) return store.imageUrl
  const category = store.category ?? (store.categoryName ? CATEGORY_BY_LABEL[store.categoryName] : undefined) ?? 'ETC'
  return CATEGORY_IMAGE[category]
}
