import { Suspense } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuthStore } from '@/features/auth'
import { ROUTES } from '@/shared/config'
import { ToastViewport } from '@/shared/ui'
import { BottomNav } from './BottomNav'
import styles from './Layout.module.css'
import { PageFallback } from './PageFallback'

/** 하단 탭바를 보여줄 탭 메인 화면 */
const TAB_ROUTES: string[] = [ROUTES.HOME, ROUTES.SEARCH, ROUTES.MY_DINING, ROUTES.MYPAGE, ROUTES.NOTIFICATIONS]

/** 고객용 공통 레이아웃 — 414 폭 모바일 프레임 + 하단 탭바 */
export function RootLayout() {
  const { pathname } = useLocation()
  const member = useAuthStore((s) => s.member)
  const showNav = TAB_ROUTES.includes(pathname)

  // 점주로 시작한 상태에서 고객 화면에 오면 점주 화면으로 (회원 바꾸기는 시작 화면에서)
  if (member?.userType === 'OWNER' && pathname !== ROUTES.LOGIN) {
    return <Navigate to={ROUTES.OWNER} replace />
  }

  return (
    <div className={`${styles.frame} ${showNav ? styles.withNav : ''}`}>
      <Suspense fallback={<PageFallback />}>
        <Outlet />
      </Suspense>
      {showNav && <BottomNav />}
      <ToastViewport />
    </div>
  )
}
