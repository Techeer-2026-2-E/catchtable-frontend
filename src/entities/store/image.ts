import { STORE_CATEGORY_LABEL, type StoreCategory } from './model'

/** 카테고리별 기본 그림 — 매장 id 를 모를 때만 씀 (public/images/stores) */
const CATEGORY_IMAGE: Record<StoreCategory, string> = {
  KOREAN: '/images/stores/korean.svg',
  JAPANESE: '/images/stores/japanese.svg',
  CHINESE: '/images/stores/chinese.svg',
  WESTERN: '/images/stores/western.svg',
  CAFE: '/images/stores/cafe.svg',
  BAR: '/images/stores/bar.svg',
  ETC: '/images/stores/etc.svg',
}

/**
 * [목 데이터] 사진이 없는 매장에 보여 줄 카테고리별 음식 사진 수
 * 파일: public/images/stores/photos/{카테고리}-{01..}.webp, 출처는 같은 폴더 CREDITS.md
 * 실제 매장 사진이 아니므로 백엔드가 imageUrl 을 주면 그 사진이 먼저 나온다
 */
const MOCK_PHOTO_COUNT: Record<StoreCategory, number> = {
  KOREAN: 8,
  JAPANESE: 10,
  CHINESE: 10,
  WESTERN: 8,
  CAFE: 8,
  BAR: 13,
  ETC: 8,
}

const CATEGORY_BY_LABEL = Object.fromEntries(
  Object.entries(STORE_CATEGORY_LABEL).map(([code, label]) => [label, code as StoreCategory]),
) as Record<string, StoreCategory>

interface StoreImageSource {
  /** 같은 매장은 늘 같은 목 사진이 나오도록 고르는 기준 */
  id?: number
  imageUrl: string | null
  category?: StoreCategory
  /** 지도 응답처럼 category 코드가 없을 때 이름("한식")으로 찾음 */
  categoryName?: string
}

const categoryOf = (store: StoreImageSource): StoreCategory =>
  store.category ?? (store.categoryName ? CATEGORY_BY_LABEL[store.categoryName] : undefined) ?? 'ETC'

const mockPhoto = (category: StoreCategory, index: number) =>
  `/images/stores/photos/${category.toLowerCase()}-${String(index + 1).padStart(2, '0')}.webp`

/** 매장 id 로 사진 묶음의 시작 위치를 정함 — 비트를 섞어 이웃 매장끼리 같은 사진이 덜 겹치게 */
function startIndex(id: number, count: number) {
  let h = id | 0
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b)
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b)
  h ^= h >>> 16
  return (h >>> 0) % count
}

/** 매장 대표 사진. 없으면 카테고리 목 사진, id 도 모르면 카테고리 기본 그림 */
export function getStoreImageSrc(store: StoreImageSource): string {
  if (store.imageUrl) return store.imageUrl
  const category = categoryOf(store)
  if (store.id == null) return CATEGORY_IMAGE[category]
  return mockPhoto(category, startIndex(store.id, MOCK_PHOTO_COUNT[category]))
}

/** 카테고리 대표 사진 — 홈 음식 종류 바로가기 등 (n 번째 목 사진) */
export const getCategoryPhoto = (category: StoreCategory, n = 0) => mockPhoto(category, n % MOCK_PHOTO_COUNT[category])

/** 매장 상세 사진 넘기기용 — 대표 사진 다음에 같은 카테고리 목 사진을 이어 붙임 (최대 count 장) */
export function getStorePhotos(store: StoreImageSource & { id: number }, count = 4): string[] {
  const category = categoryOf(store)
  const total = MOCK_PHOTO_COUNT[category]
  const start = startIndex(store.id, total)
  const mocks = Array.from({ length: Math.min(count, total) }, (_, i) => mockPhoto(category, (start + i) % total))
  const photos = store.imageUrl ? [store.imageUrl, ...mocks] : mocks
  return [...new Set(photos)].slice(0, count)
}
