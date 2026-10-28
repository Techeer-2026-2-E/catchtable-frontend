import type { MyReviewList, ReviewResult, WritableVisit } from '@/entities'
import { apiClient } from '@/shared/lib'

/*
 * 리뷰 — 백엔드 dev 구현 (작성·수정·삭제·내 리뷰)
 * 작성 가능 방문(writable)은 [목 전용] — 백엔드 미구현
 */

/** ReviewCreateRequest */
export interface CreateReviewRequest {
  reservationId: number
  /** 1 ~ 5 */
  rating: number
  /** 공백 불가, 1000자 이내 */
  content: string
  /** http(s) URL 1개 (업로드 API 없음) */
  imageUrl?: string
}

/** ReviewUpdateRequest — 보낸 필드만 수정, imageUrl "" 은 사진 삭제 */
export interface UpdateReviewRequest {
  rating?: number
  content?: string
  imageUrl?: string
}

export const reviewApi = {
  /** [목 전용] 리뷰 작성 가능한 방문 (이용 완료 + 미작성) */
  getWritable: async () => {
    const { data } = await apiClient.get<WritableVisit[]>('/user/reviews/writable')
    return data
  },
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
