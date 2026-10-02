import type { ReactNode } from 'react'
import { createBrowserRouter } from 'react-router'
import { RequireAuth } from '@/features/auth'
import { HomePage } from '@/pages/home'
import { LoginPage } from '@/pages/login'
import { MyPage } from '@/pages/mypage'
import { NotFoundPage } from '@/pages/not-found'
import { NotificationsPage } from '@/pages/notifications'
import {
  OwnerDashboardPage,
  OwnerReservationsPage,
  OwnerStorePage,
  OwnerTablesPage,
  OwnerWaitingsPage,
} from '@/pages/owner'
import { ReservationPage } from '@/pages/reservation'
import { ReservationDetailPage } from '@/pages/reservation-detail'
import { SearchPage } from '@/pages/search'
import { SignupPage } from '@/pages/signup'
import { StoreDetailPage } from '@/pages/store-detail'
import { WaitingPage } from '@/pages/waiting'
import { ROUTES } from '@/shared/config'
import { OwnerLayout } from './layouts/OwnerLayout'
import { RootLayout } from './layouts/RootLayout'

const auth = (page: ReactNode) => <RequireAuth>{page}</RequireAuth>

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      // 누구나 접근
      { path: ROUTES.HOME, element: <HomePage /> },
      { path: ROUTES.LOGIN, element: <LoginPage /> },
      { path: ROUTES.SIGNUP, element: <SignupPage /> },
      { path: ROUTES.SEARCH, element: <SearchPage /> },
      { path: ROUTES.STORE_DETAIL, element: <StoreDetailPage /> },

      // 로그인 필요
      { path: ROUTES.RESERVATION, element: auth(<ReservationPage />) },
      { path: ROUTES.RESERVATION_DETAIL, element: auth(<ReservationDetailPage />) },
      { path: ROUTES.WAITING, element: auth(<WaitingPage />) },
      { path: ROUTES.MYPAGE, element: auth(<MyPage />) },
      { path: ROUTES.NOTIFICATIONS, element: auth(<NotificationsPage />) },
    ],
  },
  {
    // 점주 전용
    element: <OwnerLayout />,
    children: [
      { path: ROUTES.OWNER, element: <OwnerDashboardPage /> },
      { path: ROUTES.OWNER_STORE, element: <OwnerStorePage /> },
      { path: ROUTES.OWNER_TABLES, element: <OwnerTablesPage /> },
      { path: ROUTES.OWNER_RESERVATIONS, element: <OwnerReservationsPage /> },
      { path: ROUTES.OWNER_WAITINGS, element: <OwnerWaitingsPage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
