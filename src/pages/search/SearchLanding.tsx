import { CalendarDays, ChevronRight, Clock, X } from 'lucide-react'
import { MapStoreItem, useRecommendedStores } from '@/features/store-map'
import { paths } from '@/shared/config'
import { dayjs } from '@/shared/lib/dayjs'
import { Chip, ChipGroup, ListSkeleton } from '@/shared/ui'
import styles from './SearchPage.module.css'

/** 추천 검색어 — 매장 이름에 자주 들어가는 말 (검색은 매장 이름 기준) */
const SUGGESTED_KEYWORDS = ['삼겹살', '라멘', '파스타', '이자카야', '스시', '김밥', '치킨', '카페', '곱창', '피자']

/** 추천 매장 몇 곳까지 */
const RECOMMEND_SIZE = 5

export interface QuickCondition {
  label: string
  date: string
  time: string
  partySize: number
}

/** 빈자리 바로 찾기 — 오늘 저녁, 내일 점심, 이번 주말 저녁 */
function quickConditions(): QuickCondition[] {
  const today = dayjs()
  // 다가오는 토요일 — 오늘이 토요일이면 다음 주 토요일
  const saturday = today.add((6 - today.day() + 7) % 7 || 7, 'day')
  return [
    { label: '오늘 저녁 7시, 2명', date: today.format('YYYY-MM-DD'), time: '19:00', partySize: 2 },
    { label: '내일 점심 12시, 2명', date: today.add(1, 'day').format('YYYY-MM-DD'), time: '12:00', partySize: 2 },
    { label: `주말(${saturday.format('M/D')}) 저녁 6시, 4명`, date: saturday.format('YYYY-MM-DD'), time: '18:00', partySize: 4 },
  ]
}

interface SearchLandingProps {
  recent: string[]
  onKeyword: (keyword: string) => void
  onRemoveRecent: (keyword: string) => void
  onClearRecent: () => void
  onCondition: (condition: QuickCondition) => void
}

/**
 * 검색 전 화면 — 최근 검색어, 추천 검색어, 빈자리 바로 찾기, 추천 매장
 * 검색어·카테고리·날짜 조건을 하나라도 고르면 검색 결과로 바뀐다
 */
export function SearchLanding({ recent, onKeyword, onRemoveRecent, onClearRecent, onCondition }: SearchLandingProps) {
  const recommended = useRecommendedStores()

  return (
    <div className={styles.landing}>
      {recent.length > 0 && (
        <section className={styles.block}>
          <div className={styles.blockHead}>
            <h2 className="t-headline-16">최근 검색어</h2>
            <button type="button" className={`${styles.textButton} t-caption-13`} onClick={onClearRecent}>
              전체 삭제
            </button>
          </div>
          <ul className={styles.recentList}>
            {recent.map((k) => (
              <li key={k} className={styles.recentItem}>
                <button type="button" className={styles.recentKeyword} onClick={() => onKeyword(k)}>
                  <Clock aria-hidden />
                  {k}
                </button>
                <button type="button" className={styles.recentRemove} aria-label={`최근 검색어 ${k} 지우기`} onClick={() => onRemoveRecent(k)}>
                  <X aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={styles.block}>
        <div className={styles.blockHead}>
          <h2 className="t-headline-16">추천 검색어</h2>
        </div>
        <ChipGroup label="추천 검색어">
          {SUGGESTED_KEYWORDS.map((k) => (
            <Chip key={k} onClick={() => onKeyword(k)}>
              {k}
            </Chip>
          ))}
        </ChipGroup>
      </section>

      <section className={styles.block}>
        <div className={styles.blockHead}>
          <h2 className="t-headline-16">빈자리 바로 찾기</h2>
        </div>
        <ul className={styles.quickList}>
          {quickConditions().map((c) => (
            <li key={c.label}>
              <button type="button" className={styles.quickItem} onClick={() => onCondition(c)}>
                <CalendarDays aria-hidden />
                <span className="t-body-15">{c.label}</span>
                <ChevronRight aria-hidden className={styles.quickChevron} />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.block}>
        <div className={styles.blockHead}>
          <div>
            <h2 className="t-headline-16">별점 높은 매장</h2>
            <p className="t-caption-13 text-tertiary">지금 예약할 수 있는 곳 중 다녀온 분들의 평가가 좋은 곳이에요</p>
          </div>
        </div>
        {recommended.isPending ? (
          <ListSkeleton rows={3} thumb="square" inset={false} />
        ) : recommended.stores.length === 0 ? (
          <p className="t-body-14 text-tertiary">추천할 매장을 찾지 못했어요</p>
        ) : (
          <ul className={styles.recommendList}>
            {recommended.stores.slice(0, RECOMMEND_SIZE).map((store) => (
              <li key={store.id}>
                {/* 거리는 추천 지역 가운데 기준이라 내 위치와 무관 — 숨김 */}
                <MapStoreItem store={{ ...store, distanceMeters: null }} to={paths.storeDetail(store.id)} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
