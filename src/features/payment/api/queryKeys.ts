export const paymentKeys = {
  all: ['payments'] as const,
  list: () => [...paymentKeys.all, 'list'] as const,
  detail: (paymentId: number) => [...paymentKeys.all, 'detail', paymentId] as const,
  prepared: (holdId: number) => [...paymentKeys.all, 'prepared', holdId] as const,
  unconfirmedRefund: (paymentId: number) => [...paymentKeys.all, 'unconfirmed-refund', paymentId] as const,
}
