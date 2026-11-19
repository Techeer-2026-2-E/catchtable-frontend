import { useEffect, useState } from 'react'

/** 움직임 줄이기 설정이거나 matchMedia 가 없는 환경(테스트)에서는 닫힘 애니메이션 없이 바로 닫는다 */
const skipMotion = () =>
  typeof window === 'undefined' || typeof window.matchMedia !== 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * 닫힐 때 애니메이션을 보여줄 시간만큼 화면에 남겨 둔다
 * - mounted: 그릴지 여부 (열려 있거나 닫히는 중)
 * - closing: 닫히는 중 — CSS 에서 [data-closing] 으로 닫힘 애니메이션을 건다
 */
export function useExitTransition(isOpen: boolean, durationMs = 180) {
  const [mounted, setMounted] = useState(isOpen)
  // 열릴 때는 렌더 중에 바로 반영 (한 박자 늦게 뜨지 않게)
  if (isOpen && !mounted) setMounted(true)

  useEffect(() => {
    if (isOpen || !mounted) return
    const timer = window.setTimeout(() => setMounted(false), skipMotion() ? 0 : durationMs)
    return () => window.clearTimeout(timer)
  }, [isOpen, mounted, durationMs])

  const instantClose = !isOpen && mounted && skipMotion()
  return { mounted: isOpen || (mounted && !instantClose), closing: !isOpen && mounted && !instantClose }
}
