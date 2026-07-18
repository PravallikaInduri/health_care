import api from "./axios";

export interface NotificationItem {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  meta: Record<string, any> | null;
  is_read: number | boolean;
  created_at: string;
  read_at: string | null;
}

export const listNotifications = (params: {
  unread?: boolean;
  limit?: number;
} = {}) =>
  api.get<{
    success: boolean;
    data: NotificationItem[];
    unreadCount: number;
  }>("/healthcare/notifications", {
    params: {
      unread: params.unread ? 1 : undefined,
      limit: params.limit,
    },
  });

export const markNotificationRead = (id: string) =>
  api.patch<{ success: boolean }>(
    `/healthcare/notifications/${id}/read`
  );

export const markAllNotificationsRead = () =>
  api.post<{ success: boolean }>(
    "/healthcare/notifications/read-all"
  );
