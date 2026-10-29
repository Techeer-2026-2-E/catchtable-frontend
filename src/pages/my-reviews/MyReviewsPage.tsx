import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { MessageSquareText } from 'lucide-react'
import { useNavigate } from 'react-router'
import { ReviewItem, type MyReview } from '@/entities'
import { reservationKeys } from '@/features/reservation'
import { useMyReviews, useReviewMutations } from '@/features/review'
import { paths } from '@/shared/config'
import { getErrorMessage } from '@/shared/lib'
import { Button, Card, Dialog, EmptyState, ErrorState, LoadingState, Page, toast, TopBar } from '@/shared/ui'
import styles from './MyReviewsPage.module.css'

/**
 * 기능명세「내 리뷰 조회」「리뷰 수정」「리뷰 삭제」 (P2)
 * GET /api/user/members/me/reviews · PATCH·DELETE /api/user/reviews/{reviewId}
 * 리뷰 작성은 마이다이닝의 이용 완료 예약에서 시작
 */
export function MyReviewsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const mine = useMyReviews()
  const { remove } = useReviewMutations()
  const [deleting, setDeleting] = useState<MyReview | null>(null)

  const confirmDelete = () => {
    if (!deleting) return
    remove.mutate(deleting.reviewId, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: reservationKeys.all })
        toast('리뷰를 삭제했어요')
        setDeleting(null)
      },
      onError: (e) => toast(getErrorMessage(e, '삭제하지 못했어요')),
    })
  }

  return (
    <Page>
      <TopBar title={`내가 쓴 리뷰${mine.data ? ` (${mine.data.length})` : ''}`} />

      {mine.isPending ? (
        <LoadingState />
      ) : mine.isError ? (
        <ErrorState onRetry={() => mine.refetch()} />
      ) : mine.data.length === 0 ? (
        <EmptyState
          icon={<MessageSquareText />}
          title="아직 쓴 리뷰가 없어요"
          description="방문한 매장의 리뷰를 남기면 다른 손님에게 도움이 돼요"
        />
      ) : (
        <ul className={styles.list}>
          {mine.data.map((review) => (
            <Card as="li" key={review.reviewId}>
              <ReviewItem
                review={review}
                actions={
                  <>
                    <Button size="S" variant="soft" onClick={() => navigate(paths.reviewEdit(review.reviewId))}>
                      수정
                    </Button>
                    <Button size="S" variant="ghost" onClick={() => setDeleting(review)}>
                      삭제
                    </Button>
                  </>
                }
              />
            </Card>
          ))}
        </ul>
      )}

      <Dialog
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        title="리뷰를 삭제할까요?"
        confirmLabel={remove.isPending ? '삭제 중…' : '삭제'}
        cancelLabel="취소"
        onConfirm={confirmDelete}
      >
        {deleting?.storeName} 리뷰가 삭제되고, 같은 방문에 다시 리뷰를 쓸 수 있어요.
      </Dialog>
    </Page>
  )
}
