/*
 * 리뷰 — 백엔드 dev review/dto 기준 (catchtable-backend dev@7d32049)
 * POST /api/user/reviews · PATCH/DELETE /api/user/reviews/{reviewId}
 * GET /api/user/members/me/reviews · GET /api/user/stores/{storeId}/reviews
 * 사진은 http(s) URL 1개(imageUrl)
 */

/** 정렬 — review.dto.ReviewSort */
export type ReviewSort = 'LATEST' | 'RATING'

/** 매장 리뷰 한 건 — StoreReviewResponse */
export interface StoreReview {
  reviewId: number
  /** 마스킹된 작성자 이름 (방*혁) */
  writerName: string
  /** 1 ~ 5 */
  rating: number
  content: string
  imageUrl: string | null
  createdAt: string
}

/** GET /api/user/stores/{storeId}/reviews — StoreReviewListResponse (페이지 단위) */
export interface StoreReviewList {
  /** 리뷰가 없으면 null */
  averageRating: number | null
  reviewCount: number
  reviews: StoreReview[]
  page: number
  size: number
  hasNext: boolean
}

/** 내 리뷰 한 건 — MyReviewResponse */
export interface MyReview {
  reviewId: number
  storeId: number
  storeName: string
  visitedAt: string
  rating: number
  content: string
  imageUrl: string | null
  createdAt: string
  updatedAt: string | null
}

/** GET /api/user/members/me/reviews — MyReviewListResponse */
export interface MyReviewList {
  reviews: MyReview[]
  page: number
  size: number
  hasNext: boolean
}

/** 작성·수정 응답 — ReviewResponse */
export interface ReviewResult {
  reviewId: number
  reservationId: number
  rating: number
  content: string
  imageUrl: string | null
  createdAt: string
}
