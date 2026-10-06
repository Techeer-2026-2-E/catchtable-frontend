export const waitingKeys = {
  all: ['waitings'] as const,
  list: () => [...waitingKeys.all, 'list'] as const,
  detail: (waitingId: number) => [...waitingKeys.all, 'detail', waitingId] as const,
}
