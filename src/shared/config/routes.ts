/** 라우트 경로 상수 — 경로 문자열 하드코딩 대신 사용 */
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  SEARCH: '/search',
  STORE_DETAIL: '/stores/:storeId',
  RESERVATION: '/stores/:storeId/reservation',
  RESERVATION_DETAIL: '/reservations/:reservationId',
  WAITING_APPLY: '/stores/:storeId/waiting',
  WAITING: '/waitings/:waitingId',
  /** 마이다이닝 — 예약·웨이팅 내역 */
  MY_DINING: '/my-dining',
  /** MY — 회원정보 설정 */
  MYPAGE: '/mypage',
  PROFILE_EDIT: '/mypage/profile',
  NOTIFICATIONS: '/notifications',

  OWNER: '/owner',
  OWNER_STORE: '/owner/stores/:storeId',
  OWNER_TABLES: '/owner/stores/:storeId/tables',
  OWNER_HOURS: '/owner/stores/:storeId/hours',
  OWNER_POLICY: '/owner/stores/:storeId/policy',
  OWNER_RESERVATIONS: '/owner/stores/:storeId/reservations',
  OWNER_WAITINGS: '/owner/stores/:storeId/waitings',
} as const

type Id = number | string

export const paths = {
  storeDetail: (storeId: Id) => `/stores/${storeId}`,
  reservation: (storeId: Id) => `/stores/${storeId}/reservation`,
  reservationDetail: (reservationId: Id) => `/reservations/${reservationId}`,
  waitingApply: (storeId: Id) => `/stores/${storeId}/waiting`,
  waiting: (waitingId: Id) => `/waitings/${waitingId}`,
  ownerStore: (storeId: Id) => `/owner/stores/${storeId}`,
  ownerTables: (storeId: Id) => `/owner/stores/${storeId}/tables`,
  ownerHours: (storeId: Id) => `/owner/stores/${storeId}/hours`,
  ownerPolicy: (storeId: Id) => `/owner/stores/${storeId}/policy`,
  ownerReservations: (storeId: Id) => `/owner/stores/${storeId}/reservations`,
  ownerWaitings: (storeId: Id) => `/owner/stores/${storeId}/waitings`,
}
