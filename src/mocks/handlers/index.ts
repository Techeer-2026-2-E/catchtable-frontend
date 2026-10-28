import { memberHandlers } from './members'
import { notificationHandlers } from './notifications'
import { ownerHandlers } from './owner'
import { reservationHandlers } from './reservations'
import { reviewHandlers } from './reviews'
import { storeHandlers } from './stores'
import { waitingHandlers } from './waitings'

/** 백엔드 dev 에 있는 API 만 — 경로·요청·응답 형식을 같게 맞춤 */
export const handlers = [
  ...memberHandlers,
  ...storeHandlers,
  ...reservationHandlers,
  ...waitingHandlers,
  ...notificationHandlers,
  ...reviewHandlers,
  ...ownerHandlers,
]
