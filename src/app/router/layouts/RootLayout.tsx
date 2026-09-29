import { Outlet, useLocation } from 'react-router'
import { ROUTES } from '@/shared/config'
import { ToastViewport } from '@/shared/ui'
import { BottomNav } from './BottomNav'
import styles from './Layout.module.css'

/** 하단 탭바를 보여줄 탭 메인 화면 */
const TAB_ROUTES: string[] = [ROUTES.HOME, ROUTES.MY_DINING, ROUTES.MYPAGE, ROUTES.NOTIFICATIONS]

/** 고객용 공통 레이아웃 — 414 폭 모바일 프레임 + 하단 탭바 */
export function RootLayout() {
  const { pathname } = useLocation()
  const showNav = TAB_ROUTES.includes(pathname)

  return (
    <div className={`${styles.frame} ${showNav ? styles.withNav : ''}`}>
      <Outlet />
      {showNav && <BottomNav />}
      <ToastViewport />
    </div>
  )
}
