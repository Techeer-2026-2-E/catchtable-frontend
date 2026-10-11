import { Star } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import styles from './StarRating.module.css'

const STARS = [1, 2, 3, 4, 5]

interface StarRatingProps {
  value: number
  /** 있으면 별을 눌러 고르는 입력 모드 */
  onChange?: (value: number) => void
  size?: 'S' | 'L'
  label?: string
  className?: string
}

/**
 * 별점 — 보기 전용(★★★★☆) 또는 입력(onChange)
 * 입력 모드는 radiogroup 으로 키보드 방향키 선택 지원
 */
export function StarRating({ value, onChange, size = 'S', label = '별점', className }: StarRatingProps) {
  if (!onChange) {
    return (
      <span className={cn(styles.stars, styles[size], className)} role="img" aria-label={`${label} ${value}점`}>
        {STARS.map((n) => (
          <Star key={n} aria-hidden className={n <= Math.round(value) ? styles.on : styles.off} />
        ))}
      </span>
    )
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') onChange(Math.min(5, value + 1))
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') onChange(Math.max(1, value - 1))
    else return
    e.preventDefault()
  }

  return (
    <div role="radiogroup" aria-label={label} className={cn(styles.stars, styles[size], className)} onKeyDown={onKeyDown}>
      {STARS.map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n}점`}
          tabIndex={value === n || (value === 0 && n === 1) ? 0 : -1}
          className={styles.button}
          onClick={() => onChange(n)}
        >
          <Star aria-hidden className={n <= value ? styles.on : styles.off} />
        </button>
      ))}
    </div>
  )
}
