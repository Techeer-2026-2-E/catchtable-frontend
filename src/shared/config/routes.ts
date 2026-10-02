/** 라우트 경로 상수 — 경로 문자열 하드코딩 대신 사용 */
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  SEARCH: '/search',
  STORE_DETAIL: '/stores/:storeId',
  RESERVATION: '/stores/:storeId/reservation',
  RESERVATION_DETAIL: '/reservations/:reservationId',
  WAITING: '/waitings/:waitingId',
  MYPAGE: '/mypage',
  NOTIFICATIONS: '/notifications',

  OWNER: '/owner',
  OWNER_STORE: '/owner/stores/:storeId',
  OWNER_TABLES: '/owner/stores/:storeId/tables',
  OWNER_RESERVATIONS: '/owner/stores/:storeId/reservations',
  OWNER_WAITINGS: '/owner/stores/:storeId/waitings',
} as const

type Id = number | string

export const paths = {
  storeDetail: (storeId: Id) => `/stores/${storeId}`,
  reservation: (storeId: Id) => `/stores/${storeId}/reservation`,
  reservationDetail: (reservationId: Id) => `/reservations/${reservationId}`,
  waiting: (waitingId: Id) => `/waitings/${waitingId}`,
  ownerStore: (storeId: Id) => `/owner/stores/${storeId}`,
  ownerTables: (storeId: Id) => `/owner/stores/${storeId}/tables`,
  ownerReservations: (storeId: Id) => `/owner/stores/${storeId}/reservations`,
  ownerWaitings: (storeId: Id) => `/owner/stores/${storeId}/waitings`,
}
