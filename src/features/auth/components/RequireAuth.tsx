import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import type { UserType } from '@/entities'
import { ROUTES } from '@/shared/config'
import { useAuthStore } from '../store/authStore'

interface RequireAuthProps {
  children: ReactNode
  /** 지정 시 해당 회원 유형만 접근 가능 (예: 점주 페이지 → 'OWNER') */
  userType?: UserType
}

export function RequireAuth({ children, userType }: RequireAuthProps) {
  const { isAuthenticated, member } = useAuthStore()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />
  }
  if (userType && member && member.userType !== userType) {
    return <Navigate to={ROUTES.HOME} replace />
  }
  return children
}
