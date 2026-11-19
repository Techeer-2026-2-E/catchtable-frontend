import { useId, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useExitTransition } from '@/shared/hooks/useExitTransition'
import { useModal } from '@/shared/hooks/useModal'
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

/** 손잡이를 이만큼(px) 아래로 끌고 놓으면 닫는다 */
const DISMISS_DISTANCE = 80

/** 날짜·인원·옵션 선택. 상단 라운드 20, 하단 CTA. 닫힐 때 아래로 내려가고, 손잡이·제목 줄을 아래로 끌어서도 닫는다 */
export function BottomSheet({ isOpen, onClose, title, headerAction, children, footer }: BottomSheetProps) {
  const titleId = useId()
  const ref = useRef<HTMLDivElement>(null)
  useModal(isOpen, onClose, ref)
  const { mounted, closing } = useExitTransition(isOpen)
  // 끌어내린 거리 — 닫히는 동안에도 유지해서 그 자리에서 이어서 내려가게 한다
  const [dragY, setDragY] = useState(0)
  const dragStart = useRef<number | null>(null)
  const [dragging, setDragging] = useState(false)
  // 다시 열릴 때는 제자리에서 시작
  const [wasOpen, setWasOpen] = useState(isOpen)
  if (wasOpen !== isOpen) {
    setWasOpen(isOpen)
    if (isOpen) setDragY(0)
  }
  if (!mounted) return null

  const onDragStart = (e: PointerEvent<HTMLDivElement>) => {
    // 닫기 버튼 등 조작 요소를 누른 경우는 끌기가 아님
    if ((e.target as HTMLElement).closest('button, a, input')) return
    dragStart.current = e.clientY
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onDragMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragStart.current == null) return
    setDragY(Math.max(0, e.clientY - dragStart.current))
  }
  const onDragEnd = () => {
    if (dragStart.current == null) return
    dragStart.current = null
    setDragging(false)
    if (dragY > DISMISS_DISTANCE) onClose()
    else setDragY(0)
  }
  return createPortal(
    <div className={`${styles.overlay} ${styles.bottom}`} data-closing={closing || undefined} onClick={onClose}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={styles.sheet}
        data-closing={closing || undefined}
        data-dragging={dragging || undefined}
        style={dragY ? { transform: `translateY(${dragY}px)` } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={styles.sheetGrip}
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
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
        </div>
        <div className={styles.sheetBody}>{children}</div>
        {footer && <div className={styles.sheetFooter}>{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
