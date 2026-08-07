import api from "./api";

export interface NotificationItem {
  id: number;
  userName: string;
  message: string;
  targetName: string;
  category: "Lead" | "Meeting" | "Follow-up" | "System";
  time: string;
  unread: boolean;
}

export interface NotificationListResponse {
  data?: {
    data?: NotificationItem[];
    meta?: {
      total: number;
      page?: number;
      limit?: number;
      totalPages?: number;
      unreadCount: number;
    };
  };
}

export interface NotificationQuery {
  page?: number;
  limit?: number;
}

export const notificationService = {
  getNotifications: async (params?: NotificationQuery) => {
    const response = await api.post("/get-notification", params);
    return response.data as NotificationListResponse;
  },

  markAsRead: async (id: number) => {
    const response = await api.put(`/update-notification-read/${id}`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await api.put("/update-notification-all/read");
    return response.data;
  }
};
