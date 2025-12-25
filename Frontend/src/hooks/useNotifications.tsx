import { useState, useEffect, useCallback, useRef } from 'react';
import { notificationsApi } from '@/apis/notifications_api';
import type { Notification as NotificationType } from '@/apis/notifications_api';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // Load notification settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await notificationsApi.getSettings();
        if (response.success) {
          setIsEnabled(response.data.notifications_enabled);
        }
      } catch (error) {
        console.error('Error loading notification settings:', error);
      }
    };
    loadSettings();
  }, []);

  // Load unread count
  const loadUnreadCount = useCallback(async () => {
    try {
      const response = await notificationsApi.getUnreadCount();
      if (response.success) {
        setUnreadCount(response.count);
      }
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  }, []);

  // Initialize - Load unread count on mount
  useEffect(() => {
    loadUnreadCount();
    
    // Request notification permission
    if (isEnabled && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [loadUnreadCount, isEnabled]);

  // Connect to WebSocket
  const connectWebSocket = useCallback(() => {
    if (!isEnabled) return;
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const ws = new WebSocket(`${WS_URL}/api/notifications/ws/admin`);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'new_notification') {
            // Add new notification to the list (keep only last 10 in memory)
            setNotifications((prev) => [data.notification, ...prev.slice(0, 9)]);
            
            // Show browser notification if enabled
            if (isEnabled && 'Notification' in window && Notification.permission === 'granted') {
              new Notification(data.notification.title, {
                body: data.notification.message,
                icon: '/lovable-uploads/a54dd6f9-1eb2-410e-a933-505a4a28f126.png',
              });
            }
          } else if (data.type === 'unread_count') {
            setUnreadCount(data.count);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        wsRef.current = null;
        
        // Attempt to reconnect
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectAttemptsRef.current++;
          
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`Reconnecting... (attempt ${reconnectAttemptsRef.current})`);
            connectWebSocket();
          }, delay);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Error connecting WebSocket:', error);
    }
  }, [isEnabled]);

  // Connect WebSocket when enabled
  useEffect(() => {
    if (isEnabled) {
      connectWebSocket();
    } else {
      // Disconnect if disabled
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    }

    // Cleanup
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [isEnabled, connectWebSocket]);

  // Mark as read
  const markAsRead = useCallback(async (notificationId: number) => {
    try {
      await notificationsApi.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      );
      // Reload unread count after marking as read
      loadUnreadCount();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [loadUnreadCount]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, is_read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: number) => {
    try {
      await notificationsApi.deleteNotification(notificationId);
      setNotifications((prev) => prev.filter((notif) => notif.id !== notificationId));
      loadUnreadCount();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, [loadUnreadCount]);

  return {
    notifications,
    unreadCount,
    isConnected,
    isEnabled,
    setIsEnabled,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
};