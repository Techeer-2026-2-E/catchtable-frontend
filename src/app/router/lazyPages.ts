import { lazy } from 'react'

/*
 * 라우트 단위 코드 분할 — 화면을 처음 열 때 해당 청크만 내려받음
 * (고객은 점주 화면 코드를, 점주는 고객 화면 코드를 받지 않음)
 * 로딩 표시는 각 레이아웃의 <Suspense> 에서 처리
 */
export const HomePage = lazy(() => import('@/pages/home').then((m) => ({ default: m.HomePage })))
export const LoginPage = lazy(() => import('@/pages/login').then((m) => ({ default: m.LoginPage })))
export const SignupPage = lazy(() => import('@/pages/signup').then((m) => ({ default: m.SignupPage })))
export const SearchPage = lazy(() => import('@/pages/search').then((m) => ({ default: m.SearchPage })))
export const StoreDetailPage = lazy(() => import('@/pages/store-detail').then((m) => ({ default: m.StoreDetailPage })))
export const ReservationPage = lazy(() => import('@/pages/reservation').then((m) => ({ default: m.ReservationPage })))
export const ReservationDetailPage = lazy(() =>
  import('@/pages/reservation-detail').then((m) => ({ default: m.ReservationDetailPage })),
)
export const WaitingApplyPage = lazy(() => import('@/pages/waiting-apply').then((m) => ({ default: m.WaitingApplyPage })))
export const WaitingPage = lazy(() => import('@/pages/waiting').then((m) => ({ default: m.WaitingPage })))
export const MyDiningPage = lazy(() => import('@/pages/my-dining').then((m) => ({ default: m.MyDiningPage })))
export const MyPage = lazy(() => import('@/pages/mypage').then((m) => ({ default: m.MyPage })))
export const ProfileEditPage = lazy(() => import('@/pages/profile-edit').then((m) => ({ default: m.ProfileEditPage })))
export const NotificationsPage = lazy(() => import('@/pages/notifications').then((m) => ({ default: m.NotificationsPage })))

// 점주 화면은 하나의 청크로 묶음
const owner = () => import('@/pages/owner')
export const OwnerDashboardPage = lazy(() => owner().then((m) => ({ default: m.OwnerDashboardPage })))
export const OwnerStorePage = lazy(() => owner().then((m) => ({ default: m.OwnerStorePage })))
export const OwnerTablesPage = lazy(() => owner().then((m) => ({ default: m.OwnerTablesPage })))
export const OwnerHoursPage = lazy(() => owner().then((m) => ({ default: m.OwnerHoursPage })))
export const OwnerPolicyPage = lazy(() => owner().then((m) => ({ default: m.OwnerPolicyPage })))
export const OwnerReservationsPage = lazy(() => owner().then((m) => ({ default: m.OwnerReservationsPage })))
export const OwnerWaitingsPage = lazy(() => owner().then((m) => ({ default: m.OwnerWaitingsPage })))
