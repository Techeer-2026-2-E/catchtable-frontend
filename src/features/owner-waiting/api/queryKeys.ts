export const ownerWaitingKeys = {
  all: ['owner-waitings'] as const,
  list: (storeId: number) => [...ownerWaitingKeys.all, storeId] as const,
}
