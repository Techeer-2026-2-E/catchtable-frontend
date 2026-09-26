import { Outlet } from 'react-router'
import { RequireAuth } from '@/features/auth'

/** 점주 페이지 공통 레이아웃 — OWNER 회원만 접근 */
export function OwnerLayout() {
  return (
    <RequireAuth userType="OWNER">
      <div className="owner-layout">
        {/* TODO: 점주 사이드바 (매장 관리 / 좌석 설정 / 예약 관리 / 웨이팅 관리) */}
        <Outlet />
      </div>
    </RequireAuth>
  )
}
