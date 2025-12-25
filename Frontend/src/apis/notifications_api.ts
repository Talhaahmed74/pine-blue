const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  related_booking_id?: string;
  related_room_number?: string;
}

export interface NotificationSettings {
  notifications_enabled: boolean;
}

export const notificationsApi = {
  async getNotifications(
    limit = 20,
    offset = 0,
    isRead?: boolean,
    timeFilter: 'new' | 'older' = 'new'
  ) {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      time_filter: timeFilter,
    });
    
    if (isRead !== undefined) {
      params.append('is_read', isRead.toString());
    }
    
    const response = await fetch(`${API_BASE_URL}/api/notifications?${params}`);
    return response.json();
  },

  async getUnreadCount() {
    const response = await fetch(`${API_BASE_URL}/api/notifications/unread-count`);
    return response.json();
  },

  async markAsRead(notificationId: number) {
    const response = await fetch(`${API_BASE_URL}/api/notifications/${notificationId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ is_read: true }),
    });
    return response.json();
  },

  async markAllAsRead() {
    const response = await fetch(`${API_BASE_URL}/api/notifications/mark-all-read`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.json();
  },

  async deleteNotification(notificationId: number) {
    const response = await fetch(`${API_BASE_URL}/api/notifications/${notificationId}`, {
      method: 'DELETE',
    });
    return response.json();
  },

  async getSettings() {
    const response = await fetch(`${API_BASE_URL}/api/notifications/settings/`);
    return response.json();
  },

  async updateSettings(settings: NotificationSettings) {
    const response = await fetch(`${API_BASE_URL}/api/notifications/settings/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    });
    return response.json();
  },
};