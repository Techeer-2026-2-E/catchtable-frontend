import { useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useModal } from '@/shared/hooks/useModal'
import { Button } from './Button'
import styles from './Overlay.module.css'

interface DialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
}

/** 확인이 필요한 행동. 폭 320, 딤(bg/overlay 50%) 위 중앙 */
export function Dialog({
  isOpen,
  onClose,
  title,
  children,
  confirmLabel = '확인',
  cancelLabel = '닫기',
  onConfirm,
}: DialogProps) {
  const titleId = useId()
  const ref = useRef<HTMLDivElement>(null)
  useModal(isOpen, onClose, ref)
  if (!isOpen) return null

  return createPortal(
    <div className={`${styles.overlay} ${styles.center}`} onClick={onClose}>
      <div
        ref={ref}
        tabIndex={-1}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={styles.dialog}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className={`${styles.dialogTitle} t-headline-16`}>
          {title}
        </h2>
        {children && <div className={`${styles.dialogBody} t-body-14`}>{children}</div>}
        <div className={styles.dialogActions}>
          <Button variant="outline" size="M" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button size="M" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
