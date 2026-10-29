export const reviewKeys = {
  all: ['reviews'] as const,
  mine: () => [...reviewKeys.all, 'mine'] as const,
}
