import { useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import styles from './TextField.module.css'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  /** 입력 아래 보조 설명 */
  helperText?: ReactNode
  /** 오류 문구 — 있으면 오류 상태로 표시 */
  error?: string
}

/** 라벨은 입력 위, 입력 높이 48 고정. 오류 문구는 입력 바로 아래 status/danger */
export function TextField({ label, helperText, error, id, className, ...props }: TextFieldProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const descId = `${inputId}-desc`
  const description = error ?? helperText

  return (
    <div className={cn(styles.field, className)}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(styles.input, error && styles.invalid)}
        aria-invalid={!!error}
        aria-describedby={description ? descId : undefined}
        {...props}
      />
      {description && (
        <p id={descId} className={cn(styles.description, error && styles.errorText)}>
          {description}
        </p>
      )}
    </div>
  )
}
