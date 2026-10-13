import { authHandlers } from './auth'
import { notificationHandlers } from './notifications'
import { ownerHandlers } from './owner'
import { paymentHandlers } from './payments'
import { reservationHandlers } from './reservations'
import { reviewHandlers } from './reviews'
import { storeHandlers } from './stores'
import { waitingHandlers } from './waitings'

export const handlers = [
  ...authHandlers,
  ...storeHandlers,
  ...reservationHandlers,
  ...paymentHandlers,
  ...waitingHandlers,
  ...notificationHandlers,
  ...reviewHandlers,
  ...ownerHandlers,
]
