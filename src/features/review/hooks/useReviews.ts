import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { reviewKeys } from '../api/queryKeys'
import { reviewApi, type UpdateReviewRequest } from '../api/reviewApi'

export function useWritableVisits() {
  return useQuery({ queryKey: reviewKeys.writable(), queryFn: reviewApi.getWritable })
}

export function useMyReviews() {
  return useQuery({ queryKey: reviewKeys.mine(), queryFn: reviewApi.getMine })
}

export function useReviewMutations() {
  const queryClient = useQueryClient()
  const onSuccess = () => queryClient.invalidateQueries({ queryKey: reviewKeys.all })
  return {
    create: useMutation({ mutationFn: reviewApi.create, onSuccess }),
    update: useMutation({
      mutationFn: ({ reviewId, body }: { reviewId: number; body: UpdateReviewRequest }) =>
        reviewApi.update(reviewId, body),
      onSuccess,
    }),
    remove: useMutation({ mutationFn: reviewApi.remove, onSuccess }),
  }
}
