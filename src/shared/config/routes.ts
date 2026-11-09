/** 라우트 경로 상수 — 경로 문자열 하드코딩 대신 사용 */
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SEARCH: '/search',
  STORE_DETAIL: '/stores/:storeId',
  RESERVATION: '/stores/:storeId/reservation',
  RESERVATION_DETAIL: '/reservations/:reservationId',
  WAITING_APPLY: '/stores/:storeId/waiting',
  WAITING: '/waitings/:waitingId',
  /** 마이다이닝 — 예약·웨이팅 내역 */
  MY_DINING: '/my-dining',
  /** 진행 중·지난 웨이팅, 예약 표 모아보기 */
  USAGE_STATUS: '/my-dining/status',
  /** MY — 회원정보 설정 */
  MYPAGE: '/mypage',
  PROFILE_EDIT: '/mypage/profile',
  NOTIFICATIONS: '/notifications',
  /** P2 유료 예약·결제 */
  PAYMENT_CHECKOUT: '/reservations/holds/:holdId/payment',
  PAYMENT_SUCCESS: '/payments/success',
  PAYMENT_FAIL: '/payments/fail',
  PAYMENTS: '/mypage/payments',
  PAYMENT_DETAIL: '/payments/:paymentId',
  /** P2 리뷰 */
  MY_REVIEWS: '/mypage/reviews',
  REVIEW_WRITE: '/reviews/write/:reservationId',
  REVIEW_EDIT: '/reviews/:reviewId/edit',

  OWNER: '/owner',
  OWNER_STORE: '/owner/stores/:storeId',
  OWNER_TABLES: '/owner/stores/:storeId/tables',
  OWNER_HOURS: '/owner/stores/:storeId/hours',
  OWNER_POLICY: '/owner/stores/:storeId/policy',
  OWNER_RESERVATIONS: '/owner/stores/:storeId/reservations',
  OWNER_WAITINGS: '/owner/stores/:storeId/waitings',
  OWNER_MENUS: '/owner/stores/:storeId/menus',
  OWNER_REVIEWS: '/owner/stores/:storeId/reviews',
} as const

type Id = number | string

export const paths = {
  storeDetail: (storeId: Id) => `/stores/${storeId}`,
  reservation: (storeId: Id) => `/stores/${storeId}/reservation`,
  reservationDetail: (reservationId: Id) => `/reservations/${reservationId}`,
  paymentCheckout: (holdId: Id) => `/reservations/holds/${holdId}/payment`,
  paymentDetail: (paymentId: Id) => `/payments/${paymentId}`,
  waitingApply: (storeId: Id) => `/stores/${storeId}/waiting`,
  waiting: (waitingId: Id) => `/waitings/${waitingId}`,
  /** 이용 현황 — ticket 을 주면 그 표의 상세 팝업을 연다 */
  usageStatus: (ticket?: { type: 'WAITING' | 'RESERVATION'; id: Id }) =>
    ticket ? `/my-dining/status?ticket=${ticket.type === 'WAITING' ? 'waiting' : 'reservation'}-${ticket.id}` : '/my-dining/status',
  reviewWrite: (reservationId: Id) => `/reviews/write/${reservationId}`,
  reviewEdit: (reviewId: Id) => `/reviews/${reviewId}/edit`,
  ownerStore: (storeId: Id) => `/owner/stores/${storeId}`,
  ownerTables: (storeId: Id) => `/owner/stores/${storeId}/tables`,
  ownerHours: (storeId: Id) => `/owner/stores/${storeId}/hours`,
  ownerPolicy: (storeId: Id) => `/owner/stores/${storeId}/policy`,
  ownerReservations: (storeId: Id) => `/owner/stores/${storeId}/reservations`,
  ownerWaitings: (storeId: Id) => `/owner/stores/${storeId}/waitings`,
  ownerMenus: (storeId: Id) => `/owner/stores/${storeId}/menus`,
  ownerReviews: (storeId: Id) => `/owner/stores/${storeId}/reviews`,
}
