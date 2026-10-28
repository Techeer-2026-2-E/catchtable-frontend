import { cn } from '@/shared/lib/cn'
import styles from './Toggle.module.css'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  disabled?: boolean
  className?: string
}

/** 설정 on/off. 켜짐은 갈색 */
export function Toggle({ checked, onChange, label, disabled, className }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(styles.toggle, checked && styles.on, className)}
    >
      <span className={styles.thumb} />
    </button>
  )
}
