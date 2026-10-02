import type { Notification } from '@/entities'
import { apiClient } from '@/shared/lib'

export const notificationApi = {
  getList: async () => {
    const { data } = await apiClient.get<Notification[]>('/user/notifications')
    return data
  },
  read: async (notificationId: number) => {
    await apiClient.patch(`/user/notifications/${notificationId}/read`)
  },
  readAll: async () => {
    await apiClient.patch('/user/notifications/read-all')
  },
}
