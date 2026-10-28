import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import styles from './Button.module.css'

/**
 * - primary: 노랑. 화면의 "지금 할 행동" — 한 화면에 1개만
 * - secondary: 갈색 채움. 보조 강조
 * - soft: 연갈색 배경. 이전·닫기·취소 같은 보조 액션
 * - outline: 흰 배경 + 테두리
 * - danger: 되돌릴 수 없는 행동(탈퇴 등)에만
 * - ghost: 텍스트 버튼
 */
export type ButtonVariant = 'primary' | 'secondary' | 'soft' | 'outline' | 'danger' | 'ghost'
/** L=하단 고정 CTA(52), M=카드 내 액션(44), S=리스트 인라인 액션(32) */
export type ButtonSize = 'L' | 'M' | 'S'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  leftIcon?: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'L',
  fullWidth = false,
  leftIcon,
  type = 'button',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        styles.button,
        styles[variant],
        styles[`size${size}`],
        fullWidth && styles.fullWidth,
        className,
      )}
      {...props}
    >
      {leftIcon}
      {children}
    </button>
  )
}
