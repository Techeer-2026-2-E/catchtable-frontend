import { useMemo, useState } from 'react'
import { ArrowLeft, CalendarDays, ChevronDown, SearchX, X } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router'
import { STORE_CATEGORY_LABEL, StoreCard, type Store, type StoreCategory } from '@/entities'
import { MOCK_STORES } from '@/entities/mock'
import { paths } from '@/shared/config'
import { dayjs } from '@/shared/lib/dayjs'
import { BottomSheet, Button, Calendar, Chip, ChipGroup, EmptyState, IconButton, Page, SearchBar } from '@/shared/ui'
import styles from './SearchPage.module.css'

type Sort = 'recommend' | 'rating' | 'review'
const SORT_LABEL: Record<Sort, string> = { recommend: '추천순', rating: '평점 높은순', review: '리뷰 많은순' }
const PARTY_SIZES = [1, 2, 3, 4, 5, 6, 7, 8]

export function SearchPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [keyword, setKeyword] = useState(searchParams.get('q') ?? '')
  const [sort, setSort] = useState<Sort>('recommend')
  const [sheet, setSheet] = useState<'sort' | 'condition' | null>(null)
  const [date, setDate] = useState<string | null>(null)
  const [partySize, setPartySize] = useState(2)

  const category = searchParams.get('category') as StoreCategory | null
  const waitingOnly = searchParams.get('waiting') === '1'

  const updateParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next, { replace: true })
  }

  // TODO(API 연동): useStoreSearch({ keyword, category, ... }) 로 교체
  const results = useMemo(() => {
    const q = keyword.trim()
    const filtered = MOCK_STORES.filter((s) => {
      if (category && s.category !== category) return false
      if (waitingOnly && !s.waitingAvailable) return false
      if (date && s.maxPartySize && s.maxPartySize < partySize) return false
      if (!q) return true
      return [s.name, s.region, STORE_CATEGORY_LABEL[s.category], s.address].some((v) => v?.includes(q))
    })
    if (sort === 'rating') return filtered.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    if (sort === 'review') return filtered.sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0))
    return filtered
  }, [keyword, category, waitingOnly, sort, date, partySize])

  const conditionLabel = date ? `${dayjs(date).format('M.D(dd)')} · ${partySize}명` : '날짜·인원'

  return (
    <Page>
      <header className={styles.header}>
        <IconButton label="뒤로 가기" icon={<ArrowLeft />} onClick={() => navigate(-1)} />
        <SearchBar
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && updateParam('q', keyword.trim() || null)}
          autoFocus={!category}
        />
        <button type="button" className={styles.condition} onClick={() => setSheet('condition')}>
          <CalendarDays aria-hidden />
          <span>{conditionLabel}</span>
        </button>
      </header>

      <div className={styles.filters}>
        <ChipGroup scroll label="검색 필터">
          <Chip size="S" onClick={() => setSheet('sort')} rightIcon={<ChevronDown />}>
            {SORT_LABEL[sort]}
          </Chip>
          <Chip size="S" selected={waitingOnly} onClick={() => updateParam('waiting', waitingOnly ? null : '1')}>
            웨이팅 가능
          </Chip>
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

      <p className={`${styles.count} t-caption-13 text-tertiary`}>매장 {results.length}곳</p>

      {results.length === 0 ? (
        <EmptyState icon={<SearchX />} title="조건에 맞는 매장이 없어요" description="검색어나 필터를 바꿔보세요" />
      ) : (
        <ul className={styles.results}>
          {results.map((store) => (
            <li key={store.id}>
              <StoreCard
                store={store}
                to={paths.storeDetail(store.id)}
                footer={<AvailabilityDays store={store} onSelect={(d) => navigate(`${paths.storeDetail(store.id)}?date=${d}`)} />}
              />
            </li>
          ))}
        </ul>
      )}

      <BottomSheet isOpen={sheet === 'sort'} onClose={() => setSheet(null)} title="정렬">
        <div className={styles.sortList} role="radiogroup">
          {(Object.keys(SORT_LABEL) as Sort[]).map((key) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={sort === key}
              className={styles.sortItem}
              onClick={() => {
                setSort(key)
                setSheet(null)
              }}
            >
              {SORT_LABEL[key]}
            </button>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet
        isOpen={sheet === 'condition'}
        onClose={() => setSheet(null)}
        title="날짜·인원"
        footer={
          <>
            <Button
              variant="soft"
              onClick={() => {
                setDate(null)
                setSheet(null)
              }}
            >
              초기화
            </Button>
            <Button onClick={() => setSheet(null)} disabled={!date}>
              적용
            </Button>
          </>
        }
      >
        <Calendar value={date} onChange={setDate} />
        <p className={`${styles.sheetLabel} t-headline-16`}>인원</p>
        <ChipGroup scroll label="인원">
          {PARTY_SIZES.map((n) => (
            <Chip key={n} selected={partySize === n} onClick={() => setPartySize(n)}>
              {n}명
            </Chip>
          ))}
        </ChipGroup>
      </BottomSheet>
    </Page>
  )
}

/**
 * 가까운 5일의 예약 가능 여부 — 기능명세「예약 가능 시간·잔여 테이블 조회」
 * TODO(API 연동): useAvailability(storeId, date) 로 교체
 */
function AvailabilityDays({ store, onSelect }: { store: Store; onSelect: (date: string) => void }) {
  const days = Array.from({ length: 5 }, (_, i) => dayjs().add(i, 'day'))
  return (
    <div className={styles.days}>
      {days.map((d, i) => {
        const closed = d.day() === 0 && store.id % 2 === 0
        const full = !closed && (store.id + i) % 4 === 0
        const label = i === 0 ? '오늘' : i === 1 ? '내일' : d.format('M/D')
        return (
          <button
            key={d.format('YYYYMMDD')}
            type="button"
            className={styles.day}
            disabled={closed || full}
            onClick={() => onSelect(d.format('YYYY-MM-DD'))}
          >
            <span className="t-caption-12">
              {label}({d.format('dd')})
            </span>
            <span className={`t-label-13 ${closed || full ? '' : 'text-accent'}`}>
              {closed ? '휴무' : full ? '마감' : '가능'}
            </span>
          </button>
        )
      })}
    </div>
  )
}
