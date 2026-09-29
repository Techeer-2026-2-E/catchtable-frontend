import { useEffect } from 'react'

/** active 인 동안 ESC 키로 닫기 */
export function useEscape(active: boolean, onEscape: () => void) {
  useEffect(() => {
    if (!active) return
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onEscape()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [active, onEscape])
}
