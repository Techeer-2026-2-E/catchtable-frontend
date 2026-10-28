import { useId, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'
import styles from './TextField.module.css'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  maxLength?: number
}

/** 리뷰·요청사항 입력. 글자 수 카운터 우하단 */
export function Textarea({ label, id, maxLength, value, className, ...props }: TextareaProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const length = typeof value === 'string' ? value.length : 0

  return (
    <div className={cn(styles.field, className)}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <textarea id={inputId} className={styles.textarea} maxLength={maxLength} value={value} {...props} />
      {maxLength && (
        <span className={styles.counter}>
          {length} / {maxLength}
        </span>
      )}
    </div>
  )
}
