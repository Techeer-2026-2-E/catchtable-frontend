export const ownerReservationKeys = {
  all: ['owner-reservations'] as const,
  list: (storeId: number, date: string) => [...ownerReservationKeys.all, storeId, date] as const,
  detail: (reservationId: number) => [...ownerReservationKeys.all, 'detail', reservationId] as const,
}
