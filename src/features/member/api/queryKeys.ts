export const memberKeys = {
  all: ['members'] as const,
  me: () => [...memberKeys.all, 'me'] as const,
}
