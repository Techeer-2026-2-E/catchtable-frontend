/*
 * 리뷰 (P2) — 노션 API 명세(reviews) 기준, 응답 필드는 제안
 * POST /api/user/reviews · PATCH/DELETE /api/user/reviews/{reviewId}
 * GET /api/user/members/me/reviews · GET /api/user/reviews/writable
 * GET /api/user/stores/{storeId}/reviews · GET /api/owner/stores/{storeId}/reviews
 */
export interface Review {
  reviewId: number
  storeId: number
  storeName: string
  reservationId: number
  authorName: string
  /** 1 ~ 5 */
  rating: number
  content: string
  imageUrls: string[]
  createdAt: string
  updatedAt: string | null
  /** 점주 답글 */
  reply: { content: string; createdAt: string } | null
}

/** 리뷰 작성 가능한 방문 (이용 완료 + 미작성) */
export interface WritableVisit {
  reservationId: number
  storeId: number
  storeName: string
  reservationStartAt: string
  partySize: number
}

/** 매장 리뷰 요약 */
export interface ReviewSummary {
  averageRating: number
  totalCount: number
  /** 별점별 개수 — index 0 = 1점 */
  ratingCounts: [number, number, number, number, number]
}
