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
export function KPICard({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: ReactNode
  highlight?: boolean
}) {
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

/** 테두리 카드 — selected 시 노랑 테두리 */
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
