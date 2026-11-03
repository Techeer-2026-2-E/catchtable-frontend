export const reservationKeys = {
  all: ['reservations'] as const,
  availability: (storeId: number, date: string, partySize: number) =>
    [...reservationKeys.all, 'availability', storeId, date, partySize] as const,
  history: (params?: object) => [...reservationKeys.all, 'history', params ?? {}] as const,
  detail: (reservationId: number) => [...reservationKeys.all, 'detail', reservationId] as const,
  hold: (holdId: number) => [...reservationKeys.all, 'hold', holdId] as const,
  refundPreview: (reservationId: number) => [...reservationKeys.all, 'refund-preview', reservationId] as const,
}
