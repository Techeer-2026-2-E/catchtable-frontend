import { useState } from 'react'
import { CalendarDays, ChevronDown, Map as MapIcon, SearchX } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { STORE_CATEGORY_LABEL, type Store, type StoreCategory } from '@/entities'
import { useAvailability } from '@/features/reservation'
import { MapStoreItem, toMapStore } from '@/features/store-map'
import { useRecentSearches, useStoreSearch } from '@/features/store-search'
import { paths, ROUTES } from '@/shared/config'
import { useDebounce } from '@/shared/hooks'
import { dayjs } from '@/shared/lib/dayjs'
import { useGeolocation } from '@/shared/lib/useGeolocation'
import { formatTime } from '@/shared/lib/format'
import { BottomSheet, Button, Calendar, Chip, ChipGroup, EmptyState, ErrorState, ListSkeleton, Page, SearchBar, Stepper, TopBar } from '@/shared/ui'
import { SearchLanding } from './SearchLanding'
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
 * 매장 검색 — GET /api/user/stores (keyword, category, date+time, partySize, page, size)
 */
export function SearchPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const condition = readCondition(searchParams)
  const category = searchParams.get('category') as StoreCategory | null
  const [keyword, setKeyword] = useState(searchParams.get('q') ?? '')
  const query = useDebounce(keyword.trim())
  const [sheetOpen, setSheetOpen] = useState(false)
  const [draft, setDraft] = useState<Condition>(() => condition ?? { date: dayjs().format('YYYY-MM-DD'), time: '19:00', partySize: 2 })
  const recent = useRecentSearches()
  // 거리 표시용 — 목 위치(강남역)가 기본, 실제 위치 모드면 권한을 물었을 때만
  const geo = useGeolocation()

  const setParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(patch).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)))
    setSearchParams(next, { replace: true })
  }

  const {
    data: results,
    isPending,
    isError,
    refetch,
    isFetching,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = useStoreSearch({
    category: category ?? undefined,
    date: condition?.date,
    time: condition?.time,
    partySize: condition?.partySize,
    keyword: query || undefined,
  })

  /** 검색어를 확정 — 주소에 남기고 최근 검색어에 더함 */
  const submitKeyword = (value: string) => {
    const k = value.trim()
    setKeyword(k)
    setParams({ q: k || null })
    if (k) recent.add(k)
  }
  // 아무 조건도 없으면 결과 대신 검색 전 화면
  const landing = !query && !keyword.trim() && !category && !condition

  const slotDate = condition?.date ?? dayjs().format('YYYY-MM-DD')
  const slotPartySize = condition?.partySize ?? 2

  return (
    <Page muted>
      <div className={styles.head}>
        <TopBar title="검색" />
        <div className={styles.searchRow}>
          <SearchBar
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onBlur={() => setParams({ q: keyword.trim() || null })}
            onKeyDown={(e) => e.key === 'Enter' && submitKeyword(keyword)}
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
          <Link to={ROUTES.STORE_MAP} className={styles.mapLink}>
            <MapIcon aria-hidden />
            지도로 보기
          </Link>
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

      {landing ? (
        <SearchLanding
          recent={recent.items}
          onKeyword={submitKeyword}
          onRemoveRecent={recent.remove}
          onClearRecent={recent.clear}
          onCondition={(c) => {
            setDraft({ date: c.date, time: c.time, partySize: c.partySize })
            setParams({ date: c.date, time: c.time, party: String(c.partySize) })
          }}
        />
      ) : isPending ? (
        <ListSkeleton rows={5} thumb="small" variant="card" />
      ) : isError && !results?.length ? (
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
                  <article className={styles.resultCard}>
                    <MapStoreItem
                      store={toMapStore(store, geo.position)}
                      to={condition ? `${paths.storeDetail(store.id)}?${new URLSearchParams({ date: slotDate, time: condition.time, party: String(slotPartySize) })}` : paths.storeDetail(store.id)}
                    />
                    {condition && (
                      <AvailableTimes
                        store={store}
                        date={slotDate}
                        partySize={slotPartySize}
                        onSelect={(time) => navigate(`${paths.storeDetail(store.id)}?${new URLSearchParams({ date: slotDate, time, party: String(slotPartySize) })}`)}
                      />
                    )}
                  </article>
                </li>
              ))}
            </ul>
          )}
          {isFetchNextPageError ? (
            <ErrorState message="매장을 더 불러오지 못했어요" onRetry={() => fetchNextPage()} />
          ) : hasNextPage && (
            <Button variant="outline" fullWidth disabled={isFetching} onClick={() => fetchNextPage()}>
              {isFetchingNextPage ? '불러오는 중…' : '더 보기'}
            </Button>
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
function AvailableTimes({ store, date, partySize, onSelect }: { store: Store; date: string; partySize: number; onSelect: (time: string) => void }) {
  const { data, isPending } = useAvailability(store.id, date, partySize)
  const open = data?.slots.filter((s) => s.available) ?? []
  const label = dayjs(date).isSame(dayjs(), 'day') ? '오늘' : dayjs(date).format('M/D(dd)')

  if (isPending) return <div className={styles.slotsSkeleton} aria-hidden />
  if (open.length === 0) return <p className="t-caption-13 text-tertiary">{label}은 예약 가능한 시간이 없어요</p>
  return (
    <div className={styles.slots} aria-label={`${label} 예약 가능 시간`}>
      {open.slice(0, 6).map((slot) => (
        <button key={slot.reservationStartAt} type="button" className={`${styles.slot} tnum`} onClick={() => onSelect(dayjs(slot.reservationStartAt).format('HH:mm'))}>
          {formatTime(slot.reservationStartAt)}
          <span className={styles.slotCount}>{slot.availableTableCount}테이블</span>
        </button>
      ))}
    </div>
  )
}
