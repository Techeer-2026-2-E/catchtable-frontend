import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import styles from './IconButton.module.css'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** 스크린리더용 이름 — 아이콘만 있는 버튼이므로 필수 */
  label: string
  icon: ReactNode
  /** ghost=상단바 액션, outline=원형 테두리, filled=노랑 강조 */
  variant?: 'ghost' | 'outline' | 'filled'
}

/** 40×40 터치 영역. 상단바 액션(알림·공유·찜)에 사용 */
export function IconButton({
  label,
  icon,
  variant = 'ghost',
  type = 'button',
  className,
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(styles.iconButton, styles[variant], className)}
      {...props}
    >
      {icon}
    </button>
  )
}
