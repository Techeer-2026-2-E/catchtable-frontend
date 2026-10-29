import { useState } from 'react'
import { CalendarDays, ChevronDown, SearchX } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router'
import { STORE_CATEGORY_LABEL, StoreCard, type Store, type StoreCategory } from '@/entities'
import { useAvailability } from '@/features/reservation'
import { useStoreSearch } from '@/features/store-search'
import { paths } from '@/shared/config'
import { dayjs } from '@/shared/lib/dayjs'
import { formatTime } from '@/shared/lib/format'
import {
  BottomSheet,
  Button,
  Calendar,
  Chip,
  ChipGroup,
  EmptyState,
  ErrorState,
  LoadingState,
  Page,
  SearchBar,
  Stepper,
  TopBar,
} from '@/shared/ui'
import styles from './SearchPage.module.css'

const TIMES = ['11:30', '12:00', '12:30', '13:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00']
type Condition = { date: string; time: string; partySize: number }

/** URL(?date&time&party)에 담긴 조건 — 홈에서 고른 조건으로 바로 들어올 수 있음 */
const readCondition = (params: URLSearchParams): Condition | null => {
  const date = params.get('date')
  const time = params.get('time')
  if (!date || !time) return null
  return { date, time, partySize: Number(params.get('party')) || 2 }
}

/**
 * 매장 검색 — GET /api/user/stores (category, date+time, partySize)
 * 이름 검색은 백엔드 조건에 없어서 받은 목록을 화면에서 거름
 */
export function SearchPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const condition = readCondition(searchParams)
  const category = searchParams.get('category') as StoreCategory | null
  const [keyword, setKeyword] = useState(searchParams.get('q') ?? '')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [draft, setDraft] = useState<Condition>(() => condition ?? { date: dayjs().format('YYYY-MM-DD'), time: '19:00', partySize: 2 })

  const setParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(patch).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)))
    setSearchParams(next, { replace: true })
  }

  const {
    data: all,
    isPending,
    isError,
    refetch,
    isFetching,
  } = useStoreSearch({
    category: category ?? undefined,
    date: condition?.date,
    time: condition?.time,
    partySize: condition?.partySize,
  })
  const query = keyword.trim().toLowerCase()
  const results = query ? all?.filter((store) => store.name.toLowerCase().includes(query)) : all

  const slotDate = condition?.date ?? dayjs().format('YYYY-MM-DD')
  const slotPartySize = condition?.partySize ?? 2

  return (
    <Page muted>
      <div className={styles.head}>
        <TopBar title="검색" leading="none" large />
        <div className={styles.searchRow}>
          <SearchBar
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onBlur={() => setParams({ q: keyword.trim() || null })}
            onKeyDown={(e) => e.key === 'Enter' && setParams({ q: keyword.trim() || null })}
            placeholder="식당 이름으로 검색"
            autoFocus={!category && !condition}
          />
        </div>
        <div className={styles.filters}>
          <button
            type="button"
            className={styles.filter}
            aria-pressed={!!condition}
            onClick={() => setSheetOpen(true)}
            aria-label="날짜, 시간, 인원으로 빈자리만 보기"
          >
            <CalendarDays aria-hidden />
            {condition ? (
              <span className="tnum">
                {dayjs(condition.date).format('M/D(dd)')} {formatTime(condition.time)}, {condition.partySize}명
              </span>
            ) : (
              <span>날짜, 시간, 인원</span>
            )}
            <ChevronDown aria-hidden />
          </button>
          {condition && (
            <button type="button" className={styles.clear} onClick={() => setParams({ date: null, time: null, party: null })}>
              조건 지우기
            </button>
          )}
        </div>

        <nav className={styles.categories} aria-label="카테고리">
          <button type="button" aria-pressed={!category} className={styles.category} onClick={() => setParams({ category: null })}>
            전체
          </button>
          {(Object.entries(STORE_CATEGORY_LABEL) as [StoreCategory, string][]).map(([code, label]) => (
            <button
              key={code}
              type="button"
              aria-pressed={category === code}
              className={styles.category}
              onClick={() => setParams({ category: category === code ? null : code })}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {isPending ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <section className={styles.results}>
          <p className={`${styles.count} t-caption-13 text-tertiary tnum`} aria-live="polite">
            {condition ? '예약 가능한 매장' : '매장'} {results?.length ?? 0}곳{isFetching && ', 찾는 중'}
          </p>
          {!results?.length ? (
            <EmptyState
              icon={<SearchX />}
              title={query ? `'${keyword.trim()}' 매장이 없어요` : '조건에 맞는 매장이 없어요'}
              description={query ? '이름을 다시 확인하거나 다른 이름으로 찾아보세요' : '다른 날짜나 시간으로 다시 찾아보세요'}
            />
          ) : (
            <ul className={styles.list}>
              {results.map((store) => (
                <li key={store.id}>
                  <StoreCard
                    store={store}
                    to={paths.storeDetail(store.id)}
                    footer={
                      condition && (
                        <AvailableTimes
                          store={store}
                          date={slotDate}
                          partySize={slotPartySize}
                          onSelect={() => navigate(`${paths.storeDetail(store.id)}?date=${slotDate}`)}
                        />
                      )
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <BottomSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="언제, 몇 명이 가세요?"
        footer={
          <>
            {condition && (
              <Button
                variant="soft"
                onClick={() => {
                  setParams({ date: null, time: null, party: null })
                  setSheetOpen(false)
                }}
              >
                조건 지우기
              </Button>
            )}
            <Button
              onClick={() => {
                setParams({ date: draft.date, time: draft.time, party: String(draft.partySize) })
                setSheetOpen(false)
              }}
            >
              이 조건으로 찾기
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
        <div className={styles.sheetParty}>
          <span className="t-headline-16">인원</span>
          <Stepper
            value={draft.partySize}
            onChange={(partySize) => setDraft({ ...draft, partySize })}
            min={1}
            max={20}
            unit="명"
            label="인원"
          />
        </div>
      </BottomSheet>
    </Page>
  )
}

/**
 * 매장 줄 아래 예약 가능 시간 — 기능명세「예약 가능 시간·잔여 테이블 조회」
 * GET /api/user/stores/{storeId}/availability
 */
function AvailableTimes({ store, date, partySize, onSelect }: { store: Store; date: string; partySize: number; onSelect: () => void }) {
  const { data, isPending } = useAvailability(store.id, date, partySize)
  const open = data?.slots.filter((s) => s.available) ?? []
  const label = dayjs(date).isSame(dayjs(), 'day') ? '오늘' : dayjs(date).format('M/D(dd)')

  if (isPending) return <div className={styles.slotsSkeleton} aria-hidden />
  if (open.length === 0) return <p className="t-caption-13 text-tertiary">{label}은 예약 가능한 시간이 없어요</p>
  return (
    <div className={styles.slots} aria-label={`${label} 예약 가능 시간`}>
      {open.slice(0, 6).map((slot) => (
        <button key={slot.reservationStartAt} type="button" className={`${styles.slot} tnum`} onClick={onSelect}>
          {formatTime(slot.reservationStartAt)}
          <span className={styles.slotCount}>{slot.availableTableCount}</span>
        </button>
      ))}
    </div>
  )
}
