import { House, MapPin, NotebookText, UserRound } from 'lucide-react'
import { NavLink } from 'react-router'
import { ROUTES } from '@/shared/config'
import styles from './Layout.module.css'

const TABS = [
  { to: ROUTES.HOME, label: '홈', icon: House, end: true },
  { to: ROUTES.MY_DINING, label: '마이다이닝', icon: NotebookText },
  { to: ROUTES.STORE_MAP, label: '지도', icon: MapPin },
  { to: ROUTES.MYPAGE, label: 'MY', icon: UserRound, end: true },
]

/** 하단 탭 4개 — 홈, 마이다이닝, 지도, MY. 검색은 홈 검색창으로 들어간다. 활성 탭은 진한 아이콘 + 굵은 라벨 */
export function BottomNav() {
  return (
    <nav className={styles.bottomNav} aria-label="주요 메뉴">
      {TABS.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navActive : ''}`}>
          <span className={styles.navIcon}>
            <Icon aria-hidden />
          </span>
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
