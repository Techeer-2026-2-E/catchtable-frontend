import { Minus, Plus } from 'lucide-react'
import styles from './Stepper.module.css'

interface StepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  unit?: string
  label: string
}

/** 인원·수량 증감. 최소/최대값에서는 버튼 비활성 */
export function Stepper({ value, onChange, min = 1, max = 99, unit = '', label }: StepperProps) {
  return (
    <div className={styles.stepper} role="group" aria-label={label}>
      <button
        type="button"
        aria-label={`${label} 줄이기`}
        className={styles.control}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <Minus />
      </button>
      <span className={styles.value} aria-live="polite">
        {value}
        {unit}
      </span>
      <button
        type="button"
        aria-label={`${label} 늘리기`}
        className={styles.control}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <Plus />
      </button>
    </div>
  )
}
