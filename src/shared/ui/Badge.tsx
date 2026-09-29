import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import styles from './Badge.module.css'

/**
 * 상태·카테고리 표시. 색만으로 구분하지 않고 반드시 문구와 함께 사용
 * - neutral: 기본·종료 상태(이용 완료, 취소)
 * - brand: 확정된 상태·매장 태그
 * - primary: 지금 주목해야 하는 진행 상태(대기 중, 입장 호출)
 * - danger: 노쇼 등 예외 상황에만
 */
export type BadgeTone = 'neutral' | 'brand' | 'primary' | 'danger'

interface BadgeProps {
  tone?: BadgeTone
  /** solid=진한 채움(특수 강조용) */
  solid?: boolean
  children: ReactNode
  className?: string
}

export function Badge({ tone = 'neutral', solid = false, children, className }: BadgeProps) {
  return (
    <span className={cn(styles.badge, styles[tone], solid && styles.solid, className)}>
      {children}
    </span>
  )
}
