export const waitingKeys = {
  all: ['waitings'] as const,
  position: (waitingId: number) => [...waitingKeys.all, 'position', waitingId] as const,
}
