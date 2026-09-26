import { Outlet } from 'react-router'

/** 고객용 공통 레이아웃 */
export function RootLayout() {
  return (
    <div className="app-layout">
      {/* TODO: 공통 Header / BottomNav */}
      <Outlet />
    </div>
  )
}
