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
  UsageStatusPage,
  MyPage,
  MyReviewsPage,
  NotificationSettingsPage,
  NotificationsPage,
  OwnerDashboardPage,
  OwnerHoursPage,
  OwnerMenusPage,
  OwnerPolicyPage,
  OwnerReservationsPage,
  OwnerReviewsPage,
  OwnerSalesPage,
  OwnerSpecialDaysPage,
  OwnerStoreInfoPage,
  OwnerStorePage,
  OwnerTablesPage,
  OwnerWaitingSettingsPage,
  OwnerWaitingsPage,
  PaymentCheckoutPage,
  PaymentDetailPage,
  PaymentReceiptPage,
  PaymentRefundPage,
  PaymentFailPage,
  PaymentsPage,
  PaymentSuccessPage,
  ProfileEditPage,
  ReservationDetailPage,
  ReservationPage,
  ReviewWritePage,
  SearchPage,
  StoreDetailPage,
  StoreMapPage,
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
      { path: ROUTES.SEARCH, element: <SearchPage /> },
      { path: ROUTES.STORE_MAP, element: <StoreMapPage /> },
      { path: ROUTES.STORE_DETAIL, element: <StoreDetailPage /> },

      // 로그인 필요
      { path: ROUTES.RESERVATION, element: auth(<ReservationPage />) },
      { path: ROUTES.RESERVATION_DETAIL, element: auth(<ReservationDetailPage />) },
      { path: ROUTES.PAYMENT_CHECKOUT, element: auth(<PaymentCheckoutPage />) },
      { path: ROUTES.PAYMENT_SUCCESS, element: auth(<PaymentSuccessPage />) },
      { path: ROUTES.PAYMENT_FAIL, element: auth(<PaymentFailPage />) },
      { path: ROUTES.PAYMENTS, element: auth(<PaymentsPage />) },
      { path: ROUTES.PAYMENT_DETAIL, element: auth(<PaymentDetailPage />) },
      { path: ROUTES.PAYMENT_RECEIPT, element: auth(<PaymentReceiptPage />) },
      { path: ROUTES.PAYMENT_REFUND, element: auth(<PaymentRefundPage />) },
      { path: ROUTES.WAITING_APPLY, element: auth(<WaitingApplyPage />) },
      { path: ROUTES.WAITING, element: auth(<WaitingPage />) },
      { path: ROUTES.MY_DINING, element: auth(<MyDiningPage />) },
      { path: ROUTES.USAGE_STATUS, element: auth(<UsageStatusPage />) },
      { path: ROUTES.MYPAGE, element: auth(<MyPage />) },
      { path: ROUTES.PROFILE_EDIT, element: auth(<ProfileEditPage />) },
      { path: ROUTES.NOTIFICATIONS, element: auth(<NotificationsPage />) },
      { path: ROUTES.NOTIFICATION_SETTINGS, element: auth(<NotificationSettingsPage />) },
      { path: ROUTES.MY_REVIEWS, element: auth(<MyReviewsPage />) },
      { path: ROUTES.REVIEW_WRITE, element: auth(<ReviewWritePage />) },
      { path: ROUTES.REVIEW_EDIT, element: auth(<ReviewWritePage />) },
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
      { path: ROUTES.OWNER_WAITING_SETTINGS, element: <OwnerWaitingSettingsPage /> },
      { path: ROUTES.OWNER_MENUS, element: <OwnerMenusPage /> },
      { path: ROUTES.OWNER_REVIEWS, element: <OwnerReviewsPage /> },
      { path: ROUTES.OWNER_SALES, element: <OwnerSalesPage /> },
      { path: ROUTES.OWNER_STORE_INFO, element: <OwnerStoreInfoPage /> },
      { path: ROUTES.OWNER_SPECIAL_DAYS, element: <OwnerSpecialDaysPage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
