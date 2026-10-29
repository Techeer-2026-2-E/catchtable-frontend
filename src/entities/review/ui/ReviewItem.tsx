import type { ReactNode } from 'react'
import { dayjs } from '@/shared/lib/dayjs'
import { Avatar, ImagePlaceholder, StarRating } from '@/shared/ui'
import type { MyReview, StoreReview } from '../model'
import styles from './ReviewItem.module.css'

interface ReviewItemProps {
  /** 매장 리뷰(작성자 이름 표시) 또는 내 리뷰(매장 이름 표시) */
  review: StoreReview | MyReview
  actions?: ReactNode
  className?: string
}

/** 리뷰 한 건 — 매장 상세 · 내 리뷰 · 점주 리뷰 조회에서 공통 사용 */
export function ReviewItem({ review, actions, className }: ReviewItemProps) {
  const isMine = 'storeName' in review
  const title = isMine ? review.storeName : review.writerName
  const date = dayjs(review.createdAt)
  const when = date.isAfter(dayjs().subtract(7, 'day')) ? date.fromNow() : date.format('YYYY.M.D')

  return (
    <article className={`${styles.item} ${className ?? ''}`}>
      <header className={styles.head}>
        {!isMine && <Avatar name={review.writerName} size={32} />}
        <div className={styles.headText}>
          <p className="t-label-15">{title}</p>
          <p className={styles.meta}>
            <StarRating value={review.rating} />
            <span className="t-caption-12 text-tertiary">
              {when}
              {isMine && review.updatedAt && ', 수정됨'}
            </span>
          </p>
        </div>
      </header>

      <p className={`${styles.content} t-body-14`}>{review.content}</p>

      {review.imageUrl && <ImagePlaceholder src={review.imageUrl} alt="첨부 사진" className={styles.photo} radius={8} />}

      {actions && <div className={styles.actions}>{actions}</div>}
    </article>
  )
}
