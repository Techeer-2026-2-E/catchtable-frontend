import { useState } from 'react'
import { MessageSquareText } from 'lucide-react'
import { useParams } from 'react-router'
import { ReviewItem, type StoreReview } from '@/entities'
import { useOwnerReviews, useReviewReply } from '@/features/owner-store'
import { isFeatureAvailable } from '@/shared/config'
import { getErrorMessage } from '@/shared/lib'
import { dayjs } from '@/shared/lib/dayjs'
import {
  Banner,
  BottomSheet,
  Button,
  Card,
  Chip,
  ChipGroup,
  Dialog,
  EmptyState,
  ErrorState,
  LoadingState,
  Page,
  StarRating,
  Textarea,
  toast,
  TopBar,
} from '@/shared/ui'
import styles from './OwnerReviewsPage.module.css'

type Filter = 'ALL' | 'UNANSWERED' | 'ANSWERED'
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'UNANSWERED', label: '미답변' },
  { value: 'ANSWERED', label: '답변 완료' },
]
const REPLY_MAX = 500

/**
 * 기능명세「리뷰 관리」「리뷰 답글」 (P2)
 * [목 전용] GET /api/owner/stores/{storeId}/reviews · POST·DELETE /api/user/reviews/{reviewId}/reply
 * 실제 백엔드에서는 매장 공개 리뷰(GET /api/user/stores/{storeId}/reviews)로 읽기만 하고 답글은 숨김
 */
export function OwnerReviewsPage() {
  const { storeId } = useParams<{ storeId: string }>()
  const id = Number(storeId)
  const { data: reviews = [], isPending, isError, refetch } = useOwnerReviews(id)
  const { save, remove } = useReviewReply(id)
  const [filter, setFilter] = useState<Filter>('ALL')
  const [editing, setEditing] = useState<StoreReview | null>(null)
  const [draft, setDraft] = useState('')
  const [deleting, setDeleting] = useState<StoreReview | null>(null)
  const canReply = isFeatureAvailable('ownerReviews')
  const onError = (e: unknown) => toast(getErrorMessage(e, '저장하지 못했어요'))

  const sorted = [...reviews].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const unanswered = sorted.filter((r) => !r.reply)
  const list = filter === 'ALL' ? sorted : filter === 'UNANSWERED' ? unanswered : sorted.filter((r) => r.reply)
  const count = (f: Filter) => (f === 'ALL' ? reviews.length : f === 'UNANSWERED' ? unanswered.length : reviews.length - unanswered.length)
  const average = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0

  const openReply = (review: StoreReview) => {
    setDraft(review.reply?.content ?? '')
    setEditing(review)
  }

  const submitReply = () => {
    if (!editing || !draft.trim()) return
    const isEdit = !!editing.reply
    save.mutate(
      { reviewId: editing.reviewId, content: draft.trim() },
      {
        onSuccess: () => {
          toast(isEdit ? '답글을 수정했어요' : '답글을 등록했어요')
          setEditing(null)
        },
        onError,
      },
    )
  }

  const confirmDelete = () => {
    if (!deleting) return
    remove.mutate(deleting.reviewId, {
      onSuccess: () => {
        toast('답글을 삭제했어요')
        setDeleting(null)
      },
      onError,
    })
  }

  return (
    <Page>
      <TopBar title={`리뷰 관리${reviews.length ? ` (${reviews.length})` : ''}`} />

      {isPending ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : reviews.length === 0 ? (
        <EmptyState
          icon={<MessageSquareText />}
          title="아직 받은 리뷰가 없어요"
          description="이용을 마친 고객이 리뷰를 남기면 여기에 모여요"
        />
      ) : (
        <>
          <section className={styles.summary}>
            <div className={styles.average}>
              <span className={styles.averageValue}>{average.toFixed(1)}</span>
              <StarRating value={average} label="평균 별점" />
              <span className="t-caption-12 text-tertiary">리뷰 {reviews.length}개</span>
            </div>
            <RatingBars reviews={reviews} />
          </section>
          {!canReply && (
            <div className={styles.filters}>
              <Banner tone="info">답글 기능은 준비 중이에요. 지금은 고객 리뷰를 확인만 할 수 있어요.</Banner>
            </div>
          )}
          {canReply && unanswered.length > 0 && (
            <p className={styles.nudge}>
              답글을 기다리는 리뷰가 <strong>{unanswered.length}개</strong> 있어요
            </p>
          )}

          {canReply && (
            <div className={styles.filters}>
              <ChipGroup label="답변 상태">
                {FILTERS.map((f) => (
                  <Chip key={f.value} size="S" selected={filter === f.value} onClick={() => setFilter(f.value)}>
                    {f.label} {count(f.value)}
                  </Chip>
                ))}
              </ChipGroup>
            </div>
          )}

          {list.length === 0 ? (
            <EmptyState title={filter === 'UNANSWERED' ? '모든 리뷰에 답글을 달았어요' : '답글을 단 리뷰가 없어요'} />
          ) : (
            <ul className={styles.list}>
              {list.map((review) => (
                <Card as="li" key={review.reviewId}>
                  <ReviewItem
                    review={review}
                    reply={
                      !canReply ? undefined : review.reply ? (
                        <div className={styles.reply}>
                          <div className={styles.replyHead}>
                            <p className="t-caption-12 text-brand">
                              사장님 답글 <span className="text-tertiary">· {dayjs(review.reply.createdAt).format('M.D')}</span>
                            </p>
                            <span className={styles.replyActions}>
                              <button type="button" className="t-caption-12 text-secondary" onClick={() => openReply(review)}>
                                수정
                              </button>
                              <button type="button" className="t-caption-12 text-secondary" onClick={() => setDeleting(review)}>
                                삭제
                              </button>
                            </span>
                          </div>
                          <p className="t-body-14">{review.reply.content}</p>
                        </div>
                      ) : (
                        <Button size="S" variant="soft" className={styles.replyButton} onClick={() => openReply(review)}>
                          답글 작성
                        </Button>
                      )
                    }
                  />
                </Card>
              ))}
            </ul>
          )}
        </>
      )}

      <BottomSheet
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.reply ? '답글 수정' : '답글 작성'}
        footer={
          <Button onClick={submitReply} disabled={!draft.trim() || save.isPending}>
            {save.isPending ? '저장 중…' : '등록'}
          </Button>
        }
      >
        {editing && (
          <div className={styles.sheet}>
            <div className={styles.quote}>
              <p className={styles.quoteHead}>
                <span className="t-label-13">{editing.writerName}</span>
                <StarRating value={editing.rating} />
              </p>
              <p className="t-caption-13 text-secondary">{editing.content}</p>
            </div>
            <Textarea
              label="답글"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="방문해주셔서 감사합니다. 다음에도 맛있게 준비할게요!"
              maxLength={REPLY_MAX}
              rows={5}
            />
            <p className="t-caption-12 text-tertiary">답글은 매장 상세의 리뷰 아래에 모든 고객에게 보여요.</p>
          </div>
        )}
      </BottomSheet>

      <Dialog
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        title="답글을 삭제할까요?"
        confirmLabel={remove.isPending ? '삭제 중…' : '삭제'}
        cancelLabel="취소"
        onConfirm={confirmDelete}
      >
        {deleting?.writerName}님 리뷰에 단 답글이 삭제돼요.
      </Dialog>
    </Page>
  )
}

/** 별점 분포 — 5점부터 1점까지 가로 막대 (단일 계열, 개수는 막대 옆 숫자로 표시) */
function RatingBars({ reviews }: { reviews: StoreReview[] }) {
  const counts = [5, 4, 3, 2, 1].map((star) => ({ star, count: reviews.filter((r) => r.rating === star).length }))
  const max = Math.max(...counts.map((c) => c.count), 1)
  return (
    <ul className={styles.bars} aria-label="별점 분포">
      {counts.map(({ star, count }) => (
        <li key={star} className={styles.barRow}>
          <span className="t-caption-12 text-tertiary">{star}점</span>
          <span className={styles.track}>
            <span className={styles.fill} style={{ width: `${(count / max) * 100}%` }} />
          </span>
          <span className={`${styles.barCount} t-caption-12`}>{count}</span>
        </li>
      ))}
    </ul>
  )
}
