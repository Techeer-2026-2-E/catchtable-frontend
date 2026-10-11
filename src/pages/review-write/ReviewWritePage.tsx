import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import type { Review } from '@/entities'
import { reservationKeys, useReservationDetail } from '@/features/reservation'
import { useMyReviews, useReviewMutations } from '@/features/review'
import { storeDetailKeys } from '@/features/store-detail'
import { ROUTES } from '@/shared/config'
import { getErrorMessage, resizeImage } from '@/shared/lib'
import { dayjs } from '@/shared/lib/dayjs'
import {
  ErrorState,
  ImagePlaceholder,
  LoadingState,
  Page,
  StarRating,
  Button,
  Textarea,
  toast,
  TopBar,
} from '@/shared/ui'
import styles from './ReviewWritePage.module.css'

const MIN_LENGTH = 10
const MAX_LENGTH = 500
const MAX_PHOTOS = 3
const RATING_HINT = ['', '별로였어요', '아쉬웠어요', '괜찮았어요', '좋았어요', '최고였어요']

interface Target {
  storeId: number
  storeName: string
  visitedAt: string
  partySize?: number
}

/**
 * 기능명세「리뷰 작성」「리뷰 수정」 (P2)
 * 작성: /reviews/write/:reservationId — 이용 완료 방문에만
 * 수정: /reviews/:reviewId/edit
 */
export function ReviewWritePage() {
  const { reservationId, reviewId } = useParams<{ reservationId?: string; reviewId?: string }>()
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
    ? { storeId: review.storeId, storeName: review.storeName, visitedAt: review.createdAt }
    : {
        storeId: reservation.data!.storeId,
        storeName: reservation.data!.storeName,
        visitedAt: reservation.data!.reservationStartAt,
        partySize: reservation.data!.partySize,
      }

  if (!editing && (reservation.data!.status !== 'COMPLETED' || reservation.data!.reviewed)) {
    return (
      <Page>
        <TopBar title={title} leading="close" />
        <ErrorState
          message={reservation.data!.reviewed ? '이미 리뷰를 작성한 방문이에요' : '이용 완료된 방문만 리뷰를 쓸 수 있어요'}
        />
      </Page>
    )
  }

  return <ReviewForm key={review?.reviewId ?? reservationId} target={target} review={review} reservationId={Number(reservationId)} />
}

function ReviewForm({ target, review, reservationId }: { target: Target; review?: Review; reservationId: number }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { create, update } = useReviewMutations()
  const [rating, setRating] = useState(review?.rating ?? 0)
  const [content, setContent] = useState(review?.content ?? '')
  const [photos, setPhotos] = useState<string[]>(review?.imageUrls ?? [])
  const fileRef = useRef<HTMLInputElement>(null)
  const editing = !!review
  const pending = create.isPending || update.isPending

  const tooShort = content.trim().length < MIN_LENGTH
  const canSubmit = rating > 0 && !tooShort && !pending

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return
    const room = MAX_PHOTOS - photos.length
    try {
      const added = await Promise.all([...files].slice(0, room).map((f) => resizeImage(f)))
      setPhotos((list) => [...list, ...added])
      if (files.length > room) toast(`사진은 ${MAX_PHOTOS}장까지 올릴 수 있어요`)
    } catch (e) {
      toast(getErrorMessage(e, '사진을 불러오지 못했어요'))
    }
  }

  const done = (message: string) => {
    // 예약 목록의 '리뷰 쓰기' 버튼과 매장 상세 리뷰도 함께 갱신
    queryClient.invalidateQueries({ queryKey: reservationKeys.all })
    queryClient.invalidateQueries({ queryKey: storeDetailKeys.detail(target.storeId) })
    toast(message)
    navigate(ROUTES.MY_REVIEWS, { replace: true })
  }
  const onError = (e: unknown) => toast(getErrorMessage(e, '저장하지 못했어요'))

  const submit = () => {
    if (!canSubmit) return
    const body = { rating, content: content.trim(), imageUrls: photos }
    if (editing) update.mutate({ reviewId: review.reviewId, body }, { onSuccess: () => done('리뷰를 수정했어요'), onError })
    else create.mutate({ reservationId, ...body }, { onSuccess: () => done('리뷰를 등록했어요'), onError })
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
          <ImagePlaceholder className={styles.thumb} radius={8} />
          <div>
            <p className="t-headline-16">{target.storeName}</p>
            <p className="t-caption-13 text-tertiary">
              {dayjs(target.visitedAt).format('M/D(dd) HH:mm')} {editing ? '작성' : '방문'}
              {target.partySize && ` · ${target.partySize}명`}
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
          <p className="t-label-15">
            사진 첨부 <span className="text-tertiary">(선택 · 최대 {MAX_PHOTOS}장)</span>
          </p>
          <ul className={styles.photos}>
            {photos.map((src, i) => (
              <li key={i} className={styles.photoSlot}>
                <ImagePlaceholder src={src} alt={`첨부 사진 ${i + 1}`} className={styles.photo} radius={8} />
                <button
                  type="button"
                  className={styles.removePhoto}
                  aria-label={`사진 ${i + 1} 삭제`}
                  onClick={() => setPhotos((list) => list.filter((_, j) => j !== i))}
                >
                  <X aria-hidden />
                </button>
              </li>
            ))}
            {photos.length < MAX_PHOTOS && (
              <li>
                <button type="button" className={styles.addPhoto} onClick={() => fileRef.current?.click()}>
                  <Plus aria-hidden />
                  <span className="t-caption-12">
                    {photos.length}/{MAX_PHOTOS}
                  </span>
                </button>
              </li>
            )}
          </ul>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              addPhotos(e.target.files)
              e.target.value = ''
            }}
          />
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
          {content.length > 0 && tooShort && (
            <p className="t-caption-12 text-danger">{MIN_LENGTH}자 이상 작성해주세요</p>
          )}
        </section>
      </div>
    </Page>
  )
}
