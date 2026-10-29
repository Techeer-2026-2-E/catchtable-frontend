import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router'
import type { MyReview } from '@/entities'
import { reservationKeys, useReservationDetail } from '@/features/reservation'
import { useMyReviews, useReviewMutations } from '@/features/review'
import { storeDetailKeys } from '@/features/store-detail'
import { ROUTES } from '@/shared/config'
import { getErrorMessage } from '@/shared/lib'
import { dayjs } from '@/shared/lib/dayjs'
import { Button, ErrorState, LoadingState, Page, StarRating, Textarea, toast, TopBar } from '@/shared/ui'
import styles from './ReviewWritePage.module.css'

/** 백엔드 ReviewCreateRequest — 공백 불가, 1000자 이내 */
const MAX_LENGTH = 1000
const RATING_HINT = ['', '별로였어요', '아쉬웠어요', '괜찮았어요', '좋았어요', '최고였어요']

interface Target {
  storeId: number
  storeName: string
  visitedAt: string
  partySize?: number
}

/**
 * 기능명세「리뷰 작성」「리뷰 수정」
 * 작성: /reviews/write/:reservationId — 이용 완료 방문에만 (이미 쓴 방문이면 서버가 거절)
 * 수정: /reviews/:reviewId/edit
 */
export function ReviewWritePage() {
  const { reservationId, reviewId } = useParams<{
    reservationId?: string
    reviewId?: string
  }>()
  const editing = !!reviewId
  const reservation = useReservationDetail(editing ? NaN : Number(reservationId))
  const mine = useMyReviews()
  const review = editing ? mine.data?.find((r) => r.reviewId === Number(reviewId)) : undefined

  const query = editing ? mine : reservation
  const title = editing ? '리뷰 수정' : '리뷰 작성'
  if (query.isPending || query.isError || (editing && !review)) {
    return (
      <Page>
        <TopBar title={title} leading="close" />
        {query.isPending ? (
          <LoadingState />
        ) : (
          <ErrorState message={editing ? '리뷰를 찾을 수 없어요' : '방문 정보를 찾을 수 없어요'} onRetry={() => query.refetch()} />
        )}
      </Page>
    )
  }

  const target: Target = review
    ? {
        storeId: review.storeId,
        storeName: review.storeName,
        visitedAt: review.visitedAt,
      }
    : {
        storeId: reservation.data!.storeId,
        storeName: reservation.data!.storeName,
        visitedAt: reservation.data!.reservationStartAt,
        partySize: reservation.data!.partySize,
      }

  if (!editing && reservation.data!.status !== 'COMPLETED') {
    return (
      <Page>
        <TopBar title={title} leading="close" />
        <ErrorState message="이용 완료된 방문만 리뷰를 쓸 수 있어요" />
      </Page>
    )
  }

  return <ReviewForm key={review?.reviewId ?? reservationId} target={target} review={review} reservationId={Number(reservationId)} />
}

function ReviewForm({ target, review, reservationId }: { target: Target; review?: MyReview; reservationId: number }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { create, update } = useReviewMutations()
  const [rating, setRating] = useState(review?.rating ?? 0)
  const [content, setContent] = useState(review?.content ?? '')
  const editing = !!review
  const pending = create.isPending || update.isPending

  const canSubmit = rating > 0 && !!content.trim() && !pending

  const done = (message: string) => {
    // 예약 목록의 '리뷰 쓰기' 버튼과 매장 상세 리뷰도 함께 갱신
    queryClient.invalidateQueries({ queryKey: reservationKeys.all })
    queryClient.invalidateQueries({
      queryKey: storeDetailKeys.detail(target.storeId),
    })
    toast(message)
    navigate(ROUTES.MY_REVIEWS, { replace: true })
  }
  const onError = (e: unknown) => toast(getErrorMessage(e, '저장하지 못했어요'))

  const submit = () => {
    if (!canSubmit) return
    const body = { rating, content: content.trim() }
    if (editing) {
      update.mutate({ reviewId: review.reviewId, body }, { onSuccess: () => done('리뷰를 수정했어요'), onError })
    } else {
      create.mutate({ reservationId, ...body }, { onSuccess: () => done('리뷰를 등록했어요'), onError })
    }
  }

  return (
    <Page
      bottom={
        <Button fullWidth disabled={!canSubmit} onClick={submit}>
          {pending ? '저장 중…' : editing ? '수정 완료' : '리뷰 등록'}
        </Button>
      }
    >
      <TopBar title={editing ? '리뷰 수정' : '리뷰 작성'} leading="close" />

      <div className={styles.form}>
        <div className={styles.store}>
          <div>
            <p className="t-headline-16">{target.storeName}</p>
            <p className="t-caption-13 text-tertiary">
              {dayjs(target.visitedAt).format('M/D(dd) HH:mm')} 방문
              {target.partySize && `, ${target.partySize}명`}
            </p>
          </div>
        </div>

        <section className={styles.rating}>
          <p className="t-headline-16">이 매장은 어떠셨나요?</p>
          <StarRating value={rating} onChange={setRating} size="L" label="매장 별점" />
          <p className="t-caption-13 text-tertiary" aria-live="polite">
            {rating ? RATING_HINT[rating] : '별을 눌러 평가해주세요'}
          </p>
        </section>

        <section className={styles.field}>
          <Textarea
            label="리뷰 내용"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="음식, 서비스, 분위기 등 방문 경험을 자유롭게 남겨주세요"
            maxLength={MAX_LENGTH}
            rows={6}
          />
        </section>
      </div>
    </Page>
  )
}
