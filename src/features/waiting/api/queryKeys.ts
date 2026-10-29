export const waitingKeys = {
  all: ['waitings'] as const,
  detail: (waitingId: number) => [...waitingKeys.all, 'detail', waitingId] as const,
}
