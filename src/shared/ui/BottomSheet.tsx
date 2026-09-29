import { useId, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useEscape } from '@/shared/hooks/useEscape'
import { IconButton } from './IconButton'
import styles from './Overlay.module.css'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: ReactNode
  /** 제목 우측 보조 요소 */
  headerAction?: ReactNode
  children: ReactNode
  /** 하단 CTA 영역 */
  footer?: ReactNode
}

/** 날짜·인원·옵션 선택. 상단 라운드 20, 하단 CTA */
export function BottomSheet({ isOpen, onClose, title, headerAction, children, footer }: BottomSheetProps) {
  const titleId = useId()
  useEscape(isOpen, onClose)
  if (!isOpen) return null

  return createPortal(
    <div className={`${styles.overlay} ${styles.bottom}`} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={styles.sheet}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.handle} />
        <div className={styles.sheetHeader}>
          {title && (
            <h2 id={titleId} className="t-title-18">
              {title}
            </h2>
          )}
          {headerAction ?? <IconButton label="닫기" icon={<X />} onClick={onClose} />}
        </div>
        <div className={styles.sheetBody}>{children}</div>
        {footer && <div className={styles.sheetFooter}>{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
