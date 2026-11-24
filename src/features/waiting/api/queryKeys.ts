export const waitingKeys = {
  all: ['waitings'] as const,
  detail: (waitingId: number) => [...waitingKeys.all, 'detail', waitingId] as const,
  receipt: (receiptId: string) => [...waitingKeys.all, 'receipt', receiptId] as const,
}
