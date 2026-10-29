import { MessageSquareText } from 'lucide-react'
import { useParams } from 'react-router'
import { ReviewItem } from '@/entities'
import { useStoreReviews } from '@/features/store-detail'
import { Card, EmptyState, ErrorState, LoadingState, Page, StarRating, TopBar } from '@/shared/ui'
import styles from './OwnerReviewsPage.module.css'

/** 백엔드 페이지 최대 크기 */
const PAGE_SIZE = 50

/**
 * 점주 리뷰 보기 — 점주용 리뷰 API 가 없어 매장 공개 리뷰(GET /api/user/stores/{storeId}/reviews)를 읽음
 * 최신순 최근 50개
 */
export function OwnerReviewsPage() {
  const { storeId } = useParams<{ storeId: string }>()
  const { data, isPending, isError, refetch } = useStoreReviews(Number(storeId), 'LATEST', PAGE_SIZE)

  return (
    <Page>
      <TopBar title={`리뷰${data?.reviewCount ? ` (${data.reviewCount})` : ''}`} />

      {isPending ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : data.reviews.length === 0 ? (
        <EmptyState
          icon={<MessageSquareText />}
          title="아직 받은 리뷰가 없어요"
          description="이용을 마친 고객이 리뷰를 남기면 여기에 모여요"
        />
      ) : (
        <>
          {data.averageRating != null && (
            <section className={styles.summary}>
              <div className={styles.average}>
                <span className={styles.averageValue}>{data.averageRating.toFixed(1)}</span>
                <StarRating value={data.averageRating} label="평균 별점" />
                <span className="t-caption-12 text-tertiary">리뷰 {data.reviewCount}개</span>
              </div>
            </section>
          )}
          <ul className={styles.list}>
            {data.reviews.map((review) => (
              <Card as="li" key={review.reviewId}>
                <ReviewItem review={review} />
              </Card>
            ))}
          </ul>
        </>
      )}
    </Page>
  )
}
