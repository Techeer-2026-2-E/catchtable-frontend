export const reservationKeys = {
  all: ['reservations'] as const,
  availability: (storeId: number, date: string, partySize: number) =>
    [...reservationKeys.all, 'availability', storeId, date, partySize] as const,
  list: () => [...reservationKeys.all, 'list'] as const,
  detail: (reservationId: number) => [...reservationKeys.all, 'detail', reservationId] as const,
}
