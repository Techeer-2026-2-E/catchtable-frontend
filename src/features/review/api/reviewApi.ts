import type { Review, WritableVisit } from '@/entities'
import { apiClient } from '@/shared/lib'

/** P2 리뷰 — 노션 명세(reviews) 경로 기준, 요청·응답 필드는 제안 */

export interface CreateReviewRequest {
  reservationId: number
  /** 1 ~ 5 */
  rating: number
  content: string
  imageUrls?: string[]
}

export interface UpdateReviewRequest {
  rating?: number
  content?: string
  imageUrls?: string[]
}

export const reviewApi = {
  /** 리뷰 작성 가능한 방문 (이용 완료 + 미작성) */
  getWritable: async () => {
    const { data } = await apiClient.get<WritableVisit[]>('/user/reviews/writable')
    return data
  },
  /** 내 리뷰 목록 */
  getMine: async () => {
    const { data } = await apiClient.get<Review[]>('/user/members/me/reviews')
    return data
  },
  create: async (body: CreateReviewRequest) => {
    const { data } = await apiClient.post<Review>('/user/reviews', body)
    return data
  },
  update: async (reviewId: number, body: UpdateReviewRequest) => {
    const { data } = await apiClient.patch<Review>(`/user/reviews/${reviewId}`, body)
    return data
  },
  remove: async (reviewId: number) => {
    await apiClient.delete(`/user/reviews/${reviewId}`)
  },
}
