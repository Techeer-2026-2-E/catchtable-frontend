import { useState } from 'react'
import { ArrowLeft, CalendarDays, SearchX, X } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router'
import { STORE_CATEGORY_LABEL, StoreCard, type Store, type StoreCategory } from '@/entities'
import { useAvailability } from '@/features/reservation'
import { useStoreSearch } from '@/features/store-search'
import { paths } from '@/shared/config'
import { dayjs } from '@/shared/lib/dayjs'
import { formatTime } from '@/shared/lib/format'
import { BottomSheet, Button, Calendar, Chip, ChipGroup, EmptyState, ErrorState, IconButton, LoadingState, Page } from '@/shared/ui'
import styles from './SearchPage.module.css'

const PARTY_SIZES = [1, 2, 3, 4, 5, 6, 7, 8]
const TIMES = ['11:30', '12:00', '12:30', '13:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00']

/** 조건별 매장 검색 — GET /api/user/stores (category · date+time · partySize) */
export function SearchPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [sheetOpen, setSheetOpen] = useState(false)
  // 시트 안에서 고르는 값과 실제 적용된 조건을 분리 — "적용" 을 눌러야 검색
  const [draft, setDraft] = useState<{ date: string | null; time: string | null; partySize: number }>({
    date: null,
    time: null,
    partySize: 2,
  })
  const [condition, setCondition] = useState<typeof draft | null>(null)

  const category = searchParams.get('category') as StoreCategory | null

  const updateParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next, { replace: true })
  }

  const {
    data: results,
    isPending,
    isError,
    refetch,
    isFetching,
  } = useStoreSearch({
    category: category ?? undefined,
    date: condition?.date ?? undefined,
    time: condition?.time ?? undefined,
    partySize: condition?.partySize,
  })

  const conditionLabel = condition?.date
    ? `${dayjs(condition.date).format('M.D(dd)')} ${condition.time ?? ''} · ${condition.partySize}명`
    : '날짜·인원'
  const slotDate = condition?.date ?? dayjs().format('YYYY-MM-DD')
  const slotPartySize = condition?.partySize ?? 2

  return (
    <Page>
      <header className={styles.header}>
        <IconButton label="뒤로 가기" icon={<ArrowLeft />} onClick={() => navigate(-1)} />
        <h1 className={`${styles.title} t-headline-16`}>매장 찾기</h1>
        <button type="button" className={styles.condition} onClick={() => setSheetOpen(true)}>
          <CalendarDays aria-hidden />
          <span>{conditionLabel}</span>
        </button>
      </header>

      <div className={styles.filters}>
        <ChipGroup scroll label="검색 필터">
          {(Object.entries(STORE_CATEGORY_LABEL) as [StoreCategory, string][]).map(([code, label]) => {
            const selected = category === code
            return (
              <Chip
                key={code}
                size="S"
                selected={selected}
                onClick={() => updateParam('category', selected ? null : code)}
                rightIcon={selected ? <X aria-label="해제" /> : undefined}
              >
                {label}
              </Chip>
            )
          })}
        </ChipGroup>
      </div>

      {isPending ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <>
          <p className={`${styles.count} t-caption-13 text-tertiary`} aria-live="polite">
            매장 {results.length}곳{isFetching && ' · 검색 중'}
          </p>
          {results.length === 0 ? (
            <EmptyState icon={<SearchX />} title="조건에 맞는 매장이 없어요" description="카테고리나 날짜·인원 조건을 바꿔보세요" />
          ) : (
            <ul className={styles.results}>
              {results.map((store) => (
                <li key={store.id}>
                  <StoreCard
                    store={store}
                    to={paths.storeDetail(store.id)}
                    footer={
                      <AvailableTimes
                        store={store}
                        date={slotDate}
                        partySize={slotPartySize}
                        onSelect={() => navigate(`${paths.storeDetail(store.id)}?date=${slotDate}`)}
                      />
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <BottomSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="날짜·시간·인원"
        footer={
          <>
            <Button
              variant="soft"
              onClick={() => {
                setDraft({ date: null, time: null, partySize: 2 })
                setCondition(null)
                setSheetOpen(false)
              }}
            >
              초기화
            </Button>
            <Button
              onClick={() => {
                setCondition(draft)
                setSheetOpen(false)
              }}
              disabled={!draft.date || !draft.time}
            >
              적용
            </Button>
          </>
        }
      >
        <Calendar value={draft.date} onChange={(date) => setDraft({ ...draft, date })} />
        <p className={`${styles.sheetLabel} t-headline-16`}>시간</p>
        <ChipGroup scroll label="시간">
          {TIMES.map((t) => (
            <Chip key={t} selected={draft.time === t} onClick={() => setDraft({ ...draft, time: t })}>
              {formatTime(t)}
            </Chip>
          ))}
        </ChipGroup>
        <p className={`${styles.sheetLabel} t-headline-16`}>인원</p>
        <ChipGroup scroll label="인원">
          {PARTY_SIZES.map((n) => (
            <Chip key={n} selected={draft.partySize === n} onClick={() => setDraft({ ...draft, partySize: n })}>
              {n}명
            </Chip>
          ))}
        </ChipGroup>
      </BottomSheet>
    </Page>
  )
}

/**
 * 매장 카드 아래 예약 가능 시간 — 기능명세「예약 가능 시간·잔여 테이블 조회」
 * GET /api/user/stores/{storeId}/availability
 */
function AvailableTimes({ store, date, partySize, onSelect }: { store: Store; date: string; partySize: number; onSelect: () => void }) {
  const { data, isPending } = useAvailability(store.id, date, partySize)
  const open = data?.slots.filter((s) => s.available) ?? []
  const label = dayjs(date).isSame(dayjs(), 'day') ? '오늘' : dayjs(date).format('M/D(dd)')

  if (isPending) return <div className={styles.slotsSkeleton} aria-hidden />
  if (open.length === 0) {
    return <p className={`${styles.noSlot} t-caption-13`}>{label} 예약 가능한 시간이 없어요</p>
  }
  return (
    <div className={styles.slots} aria-label={`${label} 예약 가능 시간`}>
      {open.slice(0, 5).map((slot) => (
        <button key={slot.reservationStartAt} type="button" className={styles.slot} onClick={onSelect}>
          <span className="t-label-13">{formatTime(slot.reservationStartAt)}</span>
          <span className="t-caption-12">{slot.availableTableCount}테이블</span>
        </button>
      ))}
    </div>
  )
}
