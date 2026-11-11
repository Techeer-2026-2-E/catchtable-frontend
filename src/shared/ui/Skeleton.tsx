import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import styles from './Skeleton.module.css'

type Size = number | string
const px = (v: Size | undefined) => (typeof v === 'number' ? `${v}px` : v)

interface SkeletonProps {
  width?: Size
  height?: Size
  /** 모서리 — 숫자는 px, 'full' 은 원/알약 */
  radius?: number | 'full'
  className?: string
  style?: CSSProperties
}

/** 내용이 올 자리를 미리 그리는 회색 블록 — 화면 낭독기에는 숨김 (감싸는 SkeletonGroup 이 "불러오는 중" 을 알림) */
export function Skeleton({ width = '100%', height = 16, radius = 6, className, style }: SkeletonProps) {
  return (
    <span
      aria-hidden
      className={cn(styles.block, className)}
      style={{ width: px(width), height: px(height), borderRadius: radius === 'full' ? 9999 : radius, ...style }}
    />
  )
}

/** 여러 스켈레톤을 묶고 한 번만 "불러오는 중" 을 알림 */
export function SkeletonGroup({ children, label = '불러오는 중', className }: { children: ReactNode; label?: string; className?: string }) {
  return (
    <div role="status" aria-label={label} aria-busy="true" className={className}>
      {children}
    </div>
  )
}

/** 글줄 — 마지막 줄은 짧게 */
export function SkeletonText({ lines = 2, lastWidth = '60%', gap = 8, lineHeight = 14 }: { lines?: number; lastWidth?: Size; gap?: number; lineHeight?: number }) {
  return (
    <span className={styles.text} style={{ gap }}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} height={lineHeight} width={i === lines - 1 && lines > 1 ? lastWidth : '100%'} />
      ))}
    </span>
  )
}

interface ListSkeletonProps {
  rows?: number
  /** 왼쪽 사진 — square: 88px 사진 카드(매장, 지도 목록), small: 56px, none: 글만(결제, 예약, 설정 목록) */
  thumb?: 'square' | 'small' | 'none'
  /** card: 테두리 있는 카드 사이 간격, divided: 구분선으로 이어지는 목록 */
  variant?: 'card' | 'divided'
  /** 오른쪽 끝 작은 블록 (금액, 토글, 버튼 자리) */
  trailing?: boolean
  label?: string
  className?: string
  /** 좌우 페이지 여백 — 이미 여백 있는 영역 안이면 false */
  inset?: boolean
}

/** 목록 스켈레톤 — 실제 행과 같은 높이로 그려서 불러온 뒤 화면이 덜 흔들리게 */
export function ListSkeleton({ rows = 4, thumb = 'none', variant = 'divided', trailing = false, label, className, inset = true }: ListSkeletonProps) {
  const size = thumb === 'square' ? 88 : 56
  return (
    <SkeletonGroup label={label} className={cn(styles.list, variant === 'card' ? styles.cards : styles.divided, inset && styles.inset, className)}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={styles.row}>
          {thumb !== 'none' && <Skeleton width={size} height={size} radius={thumb === 'square' ? 8 : 12} />}
          <span className={styles.rowText}>
            <Skeleton width="45%" height={16} />
            <Skeleton width="70%" height={13} />
            {thumb === 'square' && <Skeleton width="35%" height={13} />}
          </span>
          {trailing && <Skeleton width={56} height={20} />}
        </div>
      ))}
    </SkeletonGroup>
  )
}

/** 가로로 넘기는 카드 줄 (홈 추천) */
export function ShelfSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <SkeletonGroup className={styles.shelf}>
      {Array.from({ length: cards }, (_, i) => (
        <span key={i} className={styles.shelfCard}>
          <Skeleton width={136} height={104} radius={16} />
          <Skeleton width="80%" height={15} />
          <Skeleton width="50%" height={12} />
        </span>
      ))}
    </SkeletonGroup>
  )
}

/** 상세 화면 — 위 큰 사진(선택), 제목, 정보 블록 */
export function DetailSkeleton({ hero = false, sections = 2 }: { hero?: boolean; sections?: number }) {
  return (
    <SkeletonGroup className={styles.detail}>
      {hero && <Skeleton height={240} radius={0} className={styles.hero} />}
      <div className={styles.detailBody}>
        <Skeleton width="55%" height={24} />
        <SkeletonText lines={2} />
        {Array.from({ length: sections }, (_, i) => (
          <div key={i} className={styles.detailSection}>
            <Skeleton width="30%" height={18} />
            <SkeletonText lines={3} lastWidth="40%" />
          </div>
        ))}
      </div>
    </SkeletonGroup>
  )
}
