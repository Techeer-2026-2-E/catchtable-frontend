import { useState } from 'react'
import { ChartColumn, TrendingDown, TrendingUp } from 'lucide-react'
import { useParams } from 'react-router'
import type { SalesPeriod, SalesPoint } from '@/entities'
import { useSales } from '@/features/owner-store'
import { formatPrice } from '@/shared/lib/format'
import { Chip, ChipGroup, Divider, EmptyState, ErrorState, KPICard, LoadingState, Page, Section, TopBar } from '@/shared/ui'
import styles from './OwnerSalesPage.module.css'

const PERIODS: { value: SalesPeriod; label: string; range: string; unit: string }[] = [
  { value: 'DAY', label: '일별', range: '최근 7일', unit: '하루' },
  { value: 'WEEK', label: '주별', range: '최근 5주', unit: '주' },
  { value: 'MONTH', label: '월별', range: '최근 4개월', unit: '월' },
]

/** 축·라벨용 짧은 금액 — 1.2만, 34만 */
const compact = (n: number) =>
  n >= 10_000 ? `${(n / 10_000).toFixed(n >= 100_000 ? 0 : 1).replace(/\.0$/, '')}만` : n.toLocaleString()

/**
 * 기능명세「매출 관리」 (P2)
 * GET /api/owner/stores/{storeId}/sales?period= — 응답 필드는 제안 (SalesReport)
 */
export function OwnerSalesPage() {
  const { storeId } = useParams<{ storeId: string }>()
  const [period, setPeriod] = useState<SalesPeriod>('DAY')
  const { data, isPending, isError, refetch } = useSales(Number(storeId), period)
  const meta = PERIODS.find((p) => p.value === period)!

  return (
    <Page>
      <TopBar title="매출 관리" />
      <div className={styles.filters}>
        <ChipGroup label="조회 기간">
          {PERIODS.map((p) => (
            <Chip key={p.value} selected={period === p.value} onClick={() => setPeriod(p.value)}>
              {p.label}
            </Chip>
          ))}
        </ChipGroup>
      </div>

      {isPending ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <>
          <section className={styles.hero} aria-live="polite">
            <p className="t-caption-13 text-tertiary">{meta.range} 매출</p>
            <p className={styles.total}>{formatPrice(data.totalAmount)}</p>
            <ChangeRate rate={data.changeRate} />
          </section>

          <div className={styles.kpis}>
            <KPICard label="예약 이용" value={`${data.reservationCount}건`} />
            <KPICard label="웨이팅 착석" value={`${data.waitingCount}팀`} />
            <KPICard label={`${meta.unit} 평균`} value={compact(Math.round(data.totalAmount / Math.max(1, data.points.length)))} />
          </div>

          <Divider thick />
          <Section title={`${meta.label} 매출 추이`}>
            {data.totalAmount === 0 ? (
              <EmptyState icon={<ChartColumn />} title="이 기간에는 매출이 없어요" />
            ) : (
              <SalesChart key={period} points={data.points} />
            )}
          </Section>

          <Divider thick />
          <Section title="구간별 내역">
            <table className={styles.table}>
              <caption className="sr-only">{meta.label} 매출 내역</caption>
              <thead>
                <tr>
                  <th scope="col">기간</th>
                  <th scope="col">예약 · 웨이팅</th>
                  <th scope="col">매출</th>
                </tr>
              </thead>
              <tbody>
                {[...data.points].reverse().map((p) => (
                  <tr key={p.date}>
                    <th scope="row">{p.label}</th>
                    <td className="text-tertiary">
                      {p.reservationCount}건 · {p.waitingCount}팀
                    </td>
                    <td>{formatPrice(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="t-caption-12 text-tertiary">이용 완료 예약과 착석 완료 웨이팅 기준이에요.</p>
          </Section>
        </>
      )}
    </Page>
  )
}

function ChangeRate({ rate }: { rate: number | null }) {
  if (rate === null) return <p className="t-caption-13 text-tertiary">직전 기간 매출 기록이 없어요</p>
  if (rate === 0) return <p className="t-caption-13 text-tertiary">직전 기간과 같아요</p>
  const up = rate > 0
  const Icon = up ? TrendingUp : TrendingDown
  return (
    <p className={`${styles.change} ${up ? styles.up : styles.down}`}>
      <Icon aria-hidden />
      직전 기간보다 {Math.abs(rate)}% {up ? '늘었어요' : '줄었어요'}
    </p>
  )
}

/**
 * 단일 계열 막대 — 막대를 누르거나(모바일) 올리면(데스크톱) 위 요약에 해당 구간 값이 표시됨
 * 최고값 막대에만 금액 라벨, 나머지는 요약·표로 확인
 */
function SalesChart({ points }: { points: SalesPoint[] }) {
  const [active, setActive] = useState(points.length - 1)
  const max = Math.max(...points.map((p) => p.amount), 1)
  const maxIndex = points.findIndex((p) => p.amount === max)
  const current = points[active]

  return (
    <div className={styles.chart}>
      <p className={styles.readout} aria-live="polite">
        <span className="t-caption-13 text-tertiary">{current.label}</span>
        <strong className="t-headline-16">{formatPrice(current.amount)}</strong>
        <span className="t-caption-13 text-tertiary">
          예약 {current.reservationCount}건 · 웨이팅 {current.waitingCount}팀
        </span>
      </p>
      <div className={styles.plot} role="group" aria-label="구간별 매출 막대 그래프" onMouseLeave={() => setActive(points.length - 1)}>
        {points.map((p, i) => (
          <button
            key={p.date}
            type="button"
            className={`${styles.col} ${i === active ? styles.active : ''}`}
            aria-label={`${p.label} ${formatPrice(p.amount)}`}
            aria-pressed={i === active}
            onClick={() => setActive(i)}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
          >
            {i === maxIndex && <span className={styles.capLabel}>{compact(p.amount)}</span>}
            <span className={styles.bar} style={{ height: `max(2px, calc((100% - 1.25rem) * ${p.amount / max}))` }} />
          </button>
        ))}
      </div>
      <div className={styles.axis} aria-hidden>
        {points.map((p, i) => (
          <span key={p.date} className={i === active ? styles.axisActive : undefined}>
            {p.label}
          </span>
        ))}
      </div>
    </div>
  )
}
