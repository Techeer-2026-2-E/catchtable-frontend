import { mapHandlers } from './map'
import { memberHandlers } from './members'
import { notificationHandlers } from './notifications'
import { ownerHandlers } from './owner'
import { paymentHandlers } from './payments'
import { reservationHandlers } from './reservations'
import { reviewHandlers } from './reviews'
import { storeHandlers } from './stores'
import { waitingHandlers } from './waitings'

/** 백엔드 dev 에 있는 API 만 — 경로·요청·응답 형식을 같게 맞춤 */
export const handlers = [
  ...memberHandlers,
  // /user/stores/map/... 이 /user/stores/:storeId 에 먼저 걸리지 않게 storeHandlers 보다 앞에
  ...mapHandlers,
  ...storeHandlers,
  ...paymentHandlers,
  ...reservationHandlers,
  ...waitingHandlers,
  ...notificationHandlers,
  ...reviewHandlers,
  ...ownerHandlers,
]
