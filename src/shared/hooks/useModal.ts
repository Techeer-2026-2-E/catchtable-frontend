import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** 열려 있는 모달 수 — 여러 개가 겹쳐도 마지막 모달이 닫힐 때만 스크롤 잠금 해제 */
let openCount = 0

/**
 * 모달(다이얼로그·바텀시트) 공통 동작
 * - ESC 로 닫기
 * - 뒤 화면 스크롤 잠금
 * - 열릴 때 모달 안으로 포커스 이동, Tab 이 모달 밖으로 나가지 않게 가둠, 닫히면 원래 위치로 포커스 복귀
 */
export function useModal(active: boolean, onClose: () => void, containerRef: RefObject<HTMLElement | null>) {
  // onClose 가 매 렌더 새로 만들어져도 effect 를 다시 걸지 않도록 ref 로 보관
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!active) return
    const previouslyFocused = document.activeElement as HTMLElement | null

    openCount += 1
    const { body } = document
    const prevOverflow = body.style.overflow
    body.style.overflow = 'hidden'

    const container = containerRef.current
    const focusables = () => Array.from(container?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
    ;(focusables()[0] ?? container)?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab') return
      const items = focusables()
      if (items.length === 0) {
        e.preventDefault()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      openCount -= 1
      if (openCount === 0) body.style.overflow = prevOverflow
      previouslyFocused?.focus?.()
    }
  }, [active, containerRef])
}
