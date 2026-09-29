import { Bell, House, NotebookText, Search, UserRound } from 'lucide-react'
import { NavLink } from 'react-router'
import { ROUTES } from '@/shared/config'
import styles from './Layout.module.css'

const TABS = [
  { to: ROUTES.HOME, label: '홈', icon: House, end: true },
  { to: ROUTES.SEARCH, label: '검색', icon: Search },
  { to: ROUTES.MY_DINING, label: '마이다이닝', icon: NotebookText },
  { to: ROUTES.NOTIFICATIONS, label: '알림', icon: Bell },
  { to: ROUTES.MYPAGE, label: 'MY', icon: UserRound, end: true },
]

/** 하단 탭 5개 고정. 활성 탭은 진한 아이콘 + 굵은 라벨 */
export function BottomNav() {
  return (
    <nav className={styles.bottomNav} aria-label="주요 메뉴">
      {TABS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navActive : ''}`}
        >
          <Icon aria-hidden />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
