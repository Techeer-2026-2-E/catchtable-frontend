import type { ReactNode } from 'react'
import { QueryProvider } from './QueryProvider'

/** 전역 Provider 조합 — 새로운 Provider는 여기에 추가 */
export function AppProviders({ children }: { children: ReactNode }) {
  return <QueryProvider>{children}</QueryProvider>
}
