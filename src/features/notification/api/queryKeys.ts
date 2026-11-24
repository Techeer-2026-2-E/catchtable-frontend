export const notificationKeys = {
  all: ['notifications'] as const,
  inbox: () => [...notificationKeys.all, 'inbox'] as const,
  unread: () => [...notificationKeys.all, 'unread'] as const,
}
