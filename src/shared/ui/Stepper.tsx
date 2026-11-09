import { Minus, Plus } from 'lucide-react'
import styles from './Stepper.module.css'

interface StepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  unit?: string
  /** 한 번 누를 때 바뀌는 양 (기본 1) */
  step?: number
  /** 값 표시 형식 — 주면 unit 대신 사용 */
  format?: (value: number) => string
  label: string
}

/** 인원·수량 증감. 최소/최대값에서는 버튼 비활성 */
export function Stepper({ value, onChange, min = 1, max = 99, unit = '', step = 1, format, label }: StepperProps) {
  return (
    <div className={styles.stepper} role="group" aria-label={label}>
      <button
        type="button"
        aria-label={`${label} 줄이기`}
        className={styles.control}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - step))}
      >
        <Minus />
      </button>
      <span className={styles.value} aria-live="polite">
        {format ? format(value) : `${value}${unit}`}
      </span>
      <button
        type="button"
        aria-label={`${label} 늘리기`}
        className={styles.control}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + step))}
      >
        <Plus />
      </button>
    </div>
  )
}
