import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import styles from './Chip.module.css'

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean
  /** M=기본(36), S=작은 필터(32) */
  size?: 'M' | 'S'
  rightIcon?: ReactNode
}

/** 필터·카테고리·시간 슬롯 선택. 선택 상태는 갈색 채움 */
export function Chip({
  selected = false,
  size = 'M',
  rightIcon,
  type = 'button',
  className,
  children,
  ...props
}: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(styles.chip, styles[`size${size}`], selected && styles.selected, className)}
      {...props}
    >
      {children}
      {rightIcon}
    </button>
  )
}

/** 칩을 가로로 나열 — scroll=true 이면 한 줄 가로 스크롤 */
export function ChipGroup({
  children,
  scroll = false,
  className,
  label,
}: {
  children: ReactNode
  scroll?: boolean
  className?: string
  label?: string
}) {
  return (
    <div role="group" aria-label={label} className={cn(styles.group, scroll && styles.scroll, className)}>
      {children}
    </div>
  )
}
