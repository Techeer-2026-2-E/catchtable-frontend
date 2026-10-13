export const reviewKeys = {
  all: ['reviews'] as const,
  writable: () => [...reviewKeys.all, 'writable'] as const,
  mine: () => [...reviewKeys.all, 'mine'] as const,
}
