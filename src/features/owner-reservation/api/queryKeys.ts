export const ownerReservationKeys = {
  all: ['owner-reservations'] as const,
  list: (storeId: number, date?: string) => [...ownerReservationKeys.all, storeId, date] as const,
}
