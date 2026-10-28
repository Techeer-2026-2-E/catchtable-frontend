import type { InputHTMLAttributes, ReactNode } from 'react'
import { ImageIcon, Search, Star } from 'lucide-react'
import { Link } from 'react-router'
import { cn } from '@/shared/lib/cn'
import styles from './Misc.module.css'

/** 사진 자리. 크기는 사용하는 곳에서 조절 (src 가 있으면 이미지 표시) */
export function ImagePlaceholder({
  src,
  alt = '',
  className,
  radius = 12,
}: {
  src?: string
  alt?: string
  className?: string
  radius?: 0 | 8 | 12 | 16
}) {
  return (
    <div className={cn(styles.image, className)} style={{ borderRadius: radius / 16 + 'rem' }}>
      {src ? <img src={src} alt={alt} loading="lazy" /> : <ImageIcon aria-hidden />}
    </div>
  )
}

export function Avatar({ name, size = 40 }: { name: string; size?: 24 | 32 | 40 | 56 }) {
  return (
    <span
      className={styles.avatar}
      style={{ width: size / 16 + 'rem', height: size / 16 + 'rem', fontSize: size * 0.025 + 'rem' }}
      aria-hidden
    >
      {name.slice(0, 1)}
    </span>
  )
}

/** 매장 카드 평점 — ★ 4.5 (120) */
export function Rating({ value, count }: { value: number; count?: number }) {
  return (
    <span className={styles.rating} aria-label={`평점 ${value}${count != null ? `, 리뷰 ${count}개` : ''}`}>
      <Star aria-hidden />
      <span className={styles.ratingValue}>{value.toFixed(1)}</span>
      {count != null && <span>({count.toLocaleString()})</span>}
    </span>
  )
}

/** 점주 홈 요약 수치 */
export function KPICard({ label, value, highlight = false }: { label: string; value: ReactNode; highlight?: boolean }) {
  return (
    <div className={cn(styles.kpi, highlight && styles.kpiHighlight)}>
      <span className={styles.kpiLabel}>{label}</span>
      <span className={styles.kpiValue}>{value}</span>
    </div>
  )
}

export function EmptyState({ icon, title, description }: { icon?: ReactNode; title: string; description?: string }) {
  return (
    <div className={styles.empty}>
      {icon}
      <p className="t-body-15">{title}</p>
      {description && <p className="t-caption-13">{description}</p>}
    </div>
  )
}

/** 장부 한 줄 — 목록 안에서 아래 선으로 구분. selected 시 왼쪽 노랑 막대 */
export function Card({
  children,
  selected = false,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode
  selected?: boolean
  className?: string
  as?: 'div' | 'li' | 'article'
}) {
  return <Tag className={cn(styles.card, selected && styles.cardSelected, className)}>{children}</Tag>
}

/** 검색 입력 — to 를 주면 탭 시 검색 화면으로 이동하는 링크형 */
export function SearchBar({
  to,
  placeholder = '지역, 매장명, 메뉴 검색',
  className,
  ...props
}: { to?: string } & InputHTMLAttributes<HTMLInputElement>) {
  if (to) {
    return (
      <Link to={to} className={cn(styles.searchBar, className)}>
        <Search aria-hidden />
        <span>{placeholder}</span>
      </Link>
    )
  }
  return (
    <label className={cn(styles.searchBar, className)}>
      <Search aria-hidden />
      <input type="search" placeholder={placeholder} aria-label="검색어" {...props} />
    </label>
  )
}

/** 데이터 불러오는 중 */
export function LoadingState({ label = '불러오는 중', compact = false }: { label?: string; compact?: boolean }) {
  return (
    <div className={cn(styles.loading, compact && styles.loadingCompact)} role="status" aria-label={label}>
      <span className={styles.spinner} />
    </div>
  )
}

/** 불러오기 실패 — 다시 시도 버튼 */
export function ErrorState({ message = '정보를 불러오지 못했어요', onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className={styles.empty} role="alert">
      <p className="t-body-15">{message}</p>
      {onRetry && (
        <button type="button" className={styles.retry} onClick={onRetry}>
          다시 시도
        </button>
      )}
    </div>
  )
}

/**
 * 번호표 — 대기번호·예약 확정처럼 손에 쥐는 표. 화면에서 가장 강조하는 요소라 한 화면에 하나만
 * stub 은 절취선 아래 영역 (부가 정보)
 */
export function Ticket({
  children,
  stub,
  muted = false,
  className,
}: {
  children: ReactNode
  stub?: ReactNode
  /** 종료된 웨이팅·취소된 예약 — 노랑 대신 회색 */
  muted?: boolean
  className?: string
}) {
  return (
    <div className={cn(styles.ticket, muted && styles.ticketMuted, className)}>
      <div className={styles.ticketMain}>{children}</div>
      {stub && <div className={styles.ticketStub}>{stub}</div>}
    </div>
  )
}

/** 요약 수치 한 줄 — 장부 머리처럼 위 굵은 선, 칸 사이 세로선 */
export function StatLine({ items }: { items: { label: string; value: ReactNode; unit?: string }[] }) {
  return (
    <dl className={styles.statLine}>
      {items.map((item) => (
        <div key={item.label} className={styles.stat}>
          <dt className={styles.statLabel}>{item.label}</dt>
          <dd className={styles.statValue} style={{ margin: 0 }}>
            {item.value}
            {item.unit && <span className={styles.statUnit}>{item.unit}</span>}
          </dd>
        </div>
      ))}
    </dl>
  )
}
