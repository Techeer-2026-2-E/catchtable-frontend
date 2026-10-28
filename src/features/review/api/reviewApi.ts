import type { MyReviewList, ReviewResult } from '@/entities'
import { apiClient } from '@/shared/lib'

/*
 * 리뷰 — 작성·수정·삭제·내 리뷰
 * 사진(imageUrl, http(s) URL 1개)은 업로드 API 가 없어 화면에서 보내지 않음
 */

/** ReviewCreateRequest */
export interface CreateReviewRequest {
  reservationId: number
  /** 1 ~ 5 */
  rating: number
  /** 공백 불가, 1000자 이내 */
  content: string
}

/** ReviewUpdateRequest — 보낸 필드만 수정 */
export interface UpdateReviewRequest {
  rating?: number
  content?: string
}

export const reviewApi = {
  /** 내 리뷰 목록 — 첫 페이지 */
  getMine: async (params?: { page?: number; size?: number }) => {
    const { data } = await apiClient.get<MyReviewList>('/user/members/me/reviews', { params })
    return data
  },
  create: async (body: CreateReviewRequest) => {
    const { data } = await apiClient.post<ReviewResult>('/user/reviews', body)
    return data
  },
  update: async (reviewId: number, body: UpdateReviewRequest) => {
    const { data } = await apiClient.patch<ReviewResult>(`/user/reviews/${reviewId}`, body)
    return data
  },
  /** 204 */
  remove: async (reviewId: number) => {
    await apiClient.delete(`/user/reviews/${reviewId}`)
  },
}
