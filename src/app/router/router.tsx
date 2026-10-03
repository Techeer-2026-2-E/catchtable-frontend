import type { ReactNode } from 'react'
import { createBrowserRouter } from 'react-router'
import { RequireAuth } from '@/features/auth'
import { NotFoundPage } from '@/pages/not-found'
import { ROUTES } from '@/shared/config'
import { OwnerLayout } from './layouts/OwnerLayout'
import { RootLayout } from './layouts/RootLayout'
import {
  HomePage,
  LoginPage,
  MyDiningPage,
  MyPage,
  NotificationsPage,
  OwnerDashboardPage,
  OwnerHoursPage,
  OwnerPolicyPage,
  OwnerReservationsPage,
  OwnerStorePage,
  OwnerTablesPage,
  OwnerWaitingsPage,
  ProfileEditPage,
  ReservationDetailPage,
  ReservationPage,
  SearchPage,
  SignupPage,
  StoreDetailPage,
  WaitingApplyPage,
  WaitingPage,
} from './lazyPages'

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
      { path: ROUTES.WAITING_APPLY, element: auth(<WaitingApplyPage />) },
      { path: ROUTES.WAITING, element: auth(<WaitingPage />) },
      { path: ROUTES.MY_DINING, element: auth(<MyDiningPage />) },
      { path: ROUTES.MYPAGE, element: auth(<MyPage />) },
      { path: ROUTES.PROFILE_EDIT, element: auth(<ProfileEditPage />) },
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
      { path: ROUTES.OWNER_HOURS, element: <OwnerHoursPage /> },
      { path: ROUTES.OWNER_POLICY, element: <OwnerPolicyPage /> },
      { path: ROUTES.OWNER_RESERVATIONS, element: <OwnerReservationsPage /> },
      { path: ROUTES.OWNER_WAITINGS, element: <OwnerWaitingsPage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
