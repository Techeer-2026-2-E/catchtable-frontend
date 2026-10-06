export const ownerWaitingKeys = {
  all: ['owner-waitings'] as const,
  list: (storeId: number) => [...ownerWaitingKeys.all, storeId, 'list'] as const,
  settings: (storeId: number) => [...ownerWaitingKeys.all, storeId, 'settings'] as const,
}
