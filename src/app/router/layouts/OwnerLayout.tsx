import { Suspense } from 'react'
import { Outlet } from 'react-router'
import { RequireAuth } from '@/features/auth'
import { ToastViewport } from '@/shared/ui'
import styles from './Layout.module.css'
import { PageFallback } from './PageFallback'

/** 점주 페이지 공통 레이아웃 — OWNER 회원만 접근 */
export function OwnerLayout() {
  return (
    <RequireAuth userType="OWNER">
      <div className={styles.frame}>
        <Suspense fallback={<PageFallback />}>
        <Outlet />
      </Suspense>
        <ToastViewport />
      </div>
    </RequireAuth>
  )
}
