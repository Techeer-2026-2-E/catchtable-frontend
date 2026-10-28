import type { ReactNode } from 'react'
import { dayjs } from '@/shared/lib/dayjs'
import { Avatar, ImagePlaceholder, StarRating } from '@/shared/ui'
import type { Review } from '../model'
import styles from './ReviewItem.module.css'

interface ReviewItemProps {
  review: Review
  /** author: 작성자 이름(매장 상세·점주) / store: 매장 이름(내 리뷰) */
  heading?: 'author' | 'store'
  /** 점주 답글 자리를 대신 그릴 때 (점주 답글 작성 폼 등) */
  reply?: ReactNode
  actions?: ReactNode
  className?: string
}

/** 리뷰 한 건 — 매장 상세 · 내 리뷰 · 점주 리뷰 관리에서 공통 사용 */
export function ReviewItem({ review, heading = 'author', reply, actions, className }: ReviewItemProps) {
  const date = dayjs(review.createdAt)
  const when = date.isAfter(dayjs().subtract(7, 'day')) ? date.fromNow() : date.format('YYYY.M.D')

  return (
    <article className={`${styles.item} ${className ?? ''}`}>
      <header className={styles.head}>
        {heading === 'author' ? (
          <Avatar name={review.authorName} size={32} />
        ) : (
          <ImagePlaceholder className={styles.thumb} radius={8} />
        )}
        <div className={styles.headText}>
          <p className="t-label-15">{heading === 'author' ? review.authorName : review.storeName}</p>
          <p className={styles.meta}>
            <StarRating value={review.rating} />
            <span className="t-caption-12 text-tertiary">
              {when}
              {review.updatedAt && ' · 수정됨'}
            </span>
          </p>
        </div>
      </header>

      <p className={`${styles.content} t-body-14`}>{review.content}</p>

      {review.imageUrls.length > 0 && (
        <ul className={styles.photos} aria-label="첨부 사진">
          {review.imageUrls.map((src, i) => (
            <li key={i}>
              <ImagePlaceholder src={src} alt={`첨부 사진 ${i + 1}`} className={styles.photo} radius={8} />
            </li>
          ))}
        </ul>
      )}

      {reply ??
        (review.reply && (
          <div className={styles.reply}>
            <p className="t-caption-12 text-brand">
              사장님 답글 <span className="text-tertiary">· {dayjs(review.reply.createdAt).format('M.D')}</span>
            </p>
            <p className="t-body-14">{review.reply.content}</p>
          </div>
        ))}

      {actions && <div className={styles.actions}>{actions}</div>}
    </article>
  )
}
