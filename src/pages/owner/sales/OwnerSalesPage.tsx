import { useMemo, useState } from 'react'
import { Info } from 'lucide-react'
import { useParams } from 'react-router'
import type { SalesSummary } from '@/entities'
import { useDailySales, useSales } from '@/features/owner-store'
import { getErrorMessage } from '@/shared/lib'
import { dayjs } from '@/shared/lib/dayjs'
import { formatPrice } from '@/shared/lib/format'
import { Chip, ChipGroup, ErrorState, Page, Skeleton, SkeletonGroup, TextField, TopBar } from '@/shared/ui'
import styles from './OwnerSalesPage.module.css'

type Preset = 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM'

const PRESETS: { value: Preset; label: string }[] = [
  { value: 'TODAY', label: '오늘' },
  { value: 'WEEK', label: '최근 7일' },
  { value: 'MONTH', label: '이번 달' },
  { value: 'CUSTOM', label: '직접 선택' },
]

/** 날짜별 막대는 하루씩 조회하므로 이 일수까지만 그림 */
const MAX_CHART_DAYS = 31
const FMT = 'YYYY-MM-DD'

/** 막대 위 짧은 금액 — 1.2만, 34만 */
const compact = (n: number) => (n >= 10_000 ? `${(n / 10_000).toFixed(n >= 100_000 ? 0 : 1).replace(/\.0$/, '')}만` : n.toLocaleString())
const longDate = (d: string) => dayjs(d).format('M월 D일')

function rangeOf(preset: Preset, custom: { from: string; to: string }) {
  const today = dayjs()
  if (preset === 'TODAY') return { from: today.format(FMT), to: today.format(FMT) }
  if (preset === 'WEEK') return { from: today.subtract(6, 'day').format(FMT), to: today.format(FMT) }
  if (preset === 'MONTH') return { from: today.startOf('month').format(FMT), to: today.format(FMT) }
  return custom
}

/**
 * 점주 매출 보기 — 기능32 GET /api/owner/stores/{storeId}/sales?from=&to=
 * 기간 합계(순결제액, 승인, 환불)와 날짜별 순결제액 막대. 테스트 결제 기반 모의 집계라 응답 notice 를 그대로 보여줌
 */
export function OwnerSalesPage() {
  const { storeId = '' } = useParams<{ storeId: string }>()
  const id = Number(storeId)
  const [preset, setPreset] = useState<Preset>('WEEK')
  const [custom, setCustom] = useState(() => ({ from: dayjs().subtract(13, 'day').format(FMT), to: dayjs().format(FMT) }))
  const { from, to } = rangeOf(preset, custom)
  const invalid = !from || !to || from > to
  const summary = useSales(id, from, to)

  const days = useMemo(() => {
    if (invalid || from === to) return []
    const count = dayjs(to).diff(dayjs(from), 'day') + 1
    if (count > MAX_CHART_DAYS) return []
    return Array.from({ length: count }, (_, i) => dayjs(from).add(i, 'day').format(FMT))
  }, [from, to, invalid])
  const tooLong = !invalid && from !== to && days.length === 0

  return (
    <Page>
      <TopBar title="매출 보기" />
      <div className={styles.filters}>
        <ChipGroup label="조회 기간" scroll>
          {PRESETS.map((p) => (
            <Chip key={p.value} selected={preset === p.value} onClick={() => setPreset(p.value)}>
              {p.label}
            </Chip>
          ))}
        </ChipGroup>
      </div>

      {preset === 'CUSTOM' && (
        <div className={styles.custom}>
          <TextField label="시작일" type="date" max={custom.to} value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} />
          <TextField
            label="종료일"
            type="date"
            min={custom.from}
            max={dayjs().format(FMT)}
            value={custom.to}
            onChange={(e) => setCustom({ ...custom, to: e.target.value })}
            error={invalid ? '시작일이 종료일보다 늦어요' : undefined}
          />
        </div>
      )}

      {invalid ? null : summary.isPending ? (
        <SalesSkeleton chart={days.length > 0} />
      ) : summary.isError ? (
        <ErrorState message={getErrorMessage(summary.error, '매출을 불러오지 못했어요')} onRetry={() => summary.refetch()} />
      ) : (
        <>
          <section className={styles.hero} aria-live="polite">
            <p className="t-caption-13 text-tertiary">
              {from === to ? `${longDate(from)} 순결제액` : `${longDate(from)}부터 ${longDate(to)}까지 순결제액`}
            </p>
            <p className={styles.total}>{formatPrice(summary.data.netAmount)}</p>
          </section>

          {days.length > 0 && <DailyChart storeId={id} days={days} />}
          {tooLong && (
            <p className={`${styles.caption} t-caption-12 text-tertiary`}>{MAX_CHART_DAYS}일 이하로 고르면 날짜별 막대가 나와요</p>
          )}

          <Breakdown summary={summary.data} />

          <p className={`${styles.notice} t-caption-13`}>
            <Info aria-hidden />
            {summary.data.notice}
          </p>
          <p className={`${styles.caption} t-caption-12 text-tertiary`}>
            결제가 승인된 날 기준으로 모아요. 이후에 환불되면 지난 기간의 환불, 순결제액도 함께 바뀌어요.
          </p>
        </>
      )}
    </Page>
  )
}

function Breakdown({ summary }: { summary: SalesSummary }) {
  return (
    <dl className={styles.breakdown}>
      <div>
        <dt className="t-body-15 text-secondary">승인된 결제</dt>
        <dd className="t-headline-16 tnum">{formatPrice(summary.approvedAmount)}</dd>
      </div>
      <div>
        <dt className="t-body-15 text-secondary">환불</dt>
        <dd className="t-headline-16 tnum">{summary.refundedAmount > 0 ? `${formatPrice(summary.refundedAmount)} 차감` : formatPrice(0)}</dd>
      </div>
    </dl>
  )
}

/**
 * 날짜별 순결제액 막대 — 막대를 누르거나(모바일) 올리면(데스크톱) 위에 그날 값이 나옴
 * 최고값 막대에만 금액 라벨. 축 라벨은 막대가 많으면 몇 칸 건너 표시
 */
function DailyChart({ storeId, days }: { storeId: number; days: string[] }) {
  const daily = useDailySales(storeId, days)
  const [picked, setPicked] = useState<number | null>(null)
  if (daily.isPending) return <ChartSkeleton />
  if (daily.isError || !daily.data) return <ErrorState message="날짜별 매출을 불러오지 못했어요" onRetry={daily.refetch} />

  const points = daily.data
  const last = points.length - 1
  const active = picked == null || picked > last ? last : picked
  const max = Math.max(...points.map((p) => p.netAmount), 1)
  const maxIndex = points.findIndex((p) => p.netAmount === max)
  const step = points.length <= 10 ? 1 : Math.ceil(points.length / 7)
  const current = points[active]

  return (
    <section className={styles.chart} aria-label="날짜별 순결제액">
      <p className={styles.readout} aria-live="polite">
        <span className="t-caption-13 text-tertiary">{dayjs(current.from).format('M월 D일 (dd)')}</span>
        <strong className="t-headline-16 tnum">{formatPrice(current.netAmount)}</strong>
        <span className="t-caption-12 text-tertiary tnum">
          승인 {formatPrice(current.approvedAmount)}, 환불 {formatPrice(current.refundedAmount)}
        </span>
      </p>
      <div className={styles.plot} role="group" aria-label="날짜별 순결제액 막대 그래프" onMouseLeave={() => setPicked(null)}>
        {points.map((p, i) => (
          <button
            key={p.from}
            type="button"
            className={`${styles.col} ${i === active ? styles.active : ''}`}
            aria-label={`${longDate(p.from)} ${formatPrice(p.netAmount)}`}
            aria-pressed={i === active}
            onClick={() => setPicked(i)}
            onMouseEnter={() => setPicked(i)}
            onFocus={() => setPicked(i)}
          >
            {i === maxIndex && p.netAmount > 0 && <span className={styles.capLabel}>{compact(p.netAmount)}</span>}
            <span className={styles.bar} style={{ height: `max(2px, calc((100% - 1.25rem) * ${p.netAmount / max}))` }} />
          </button>
        ))}
      </div>
      <div className={styles.axis} aria-hidden>
        {points.map((p, i) => (
          <span key={p.from} className={i === active ? styles.axisActive : undefined}>
            {i % step === 0 || i === last ? dayjs(p.from).format('M/D') : ''}
          </span>
        ))}
      </div>
      <p className="t-caption-12 text-tertiary">날짜별 순결제액이에요. 막대를 누르면 위에 그날 금액이 나와요.</p>
    </section>
  )
}

function ChartSkeleton() {
  return (
    <SkeletonGroup className={styles.chart}>
      <Skeleton width="60%" height={20} />
      <div className={styles.plotSkeleton}>
        {[45, 20, 8, 35, 80, 65, 25].map((h, i) => (
          <Skeleton key={i} height={`${h}%`} radius={4} className={styles.barSkeleton} />
        ))}
      </div>
    </SkeletonGroup>
  )
}

function SalesSkeleton({ chart }: { chart: boolean }) {
  return (
    <>
      <SkeletonGroup className={styles.hero}>
        <Skeleton width="55%" height={14} />
        <Skeleton width="45%" height={34} />
      </SkeletonGroup>
      {chart && <ChartSkeleton />}
      <SkeletonGroup className={styles.breakdown}>
        <Skeleton height={20} />
        <Skeleton height={20} />
      </SkeletonGroup>
    </>
  )
}
