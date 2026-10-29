import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { reviewKeys } from '../api/queryKeys'
import { reviewApi, type UpdateReviewRequest } from '../api/reviewApi'

/** 내 리뷰 — 최근 50개 (백엔드 페이지 최대 크기) */
export function useMyReviews() {
  return useQuery({
    queryKey: reviewKeys.mine(),
    queryFn: () => reviewApi.getMine({ size: 50 }),
    select: (list) => list.reviews,
  })
}

export function useReviewMutations() {
  const queryClient = useQueryClient()
  const onSuccess = () => queryClient.invalidateQueries({ queryKey: reviewKeys.all })
  return {
    create: useMutation({ mutationFn: reviewApi.create, onSuccess }),
    update: useMutation({
      mutationFn: ({ reviewId, body }: { reviewId: number; body: UpdateReviewRequest }) => reviewApi.update(reviewId, body),
      onSuccess,
    }),
    remove: useMutation({ mutationFn: reviewApi.remove, onSuccess }),
  }
}
