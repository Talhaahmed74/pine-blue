import { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, X, Loader2, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { notificationsApi } from '@/apis/notifications_api';
import type { Notification as NotificationType } from '@/apis/notifications_api';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface NotificationsPanelProps {
  unreadCount: number;
  isConnected: boolean;
  onMarkAsRead: (id: number) => void;
  onMarkAllAsRead: () => void;
  onDelete: (id: number) => void;
  liveNotifications: NotificationType[];
}

type TimeFilter = 'new' | 'older';

export const NotificationsPanel = ({
  unreadCount,
  isConnected,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  liveNotifications,
}: NotificationsPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('new');
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const LIMIT = 20;

  const loadNotifications = useCallback(async (
    filter: TimeFilter = 'new',
    currentOffset = 0,
    append = false
  ) => {
    try {
      if (!append) setLoading(true);
      else setLoadingMore(true);

      const response = await notificationsApi.getNotifications(
        LIMIT,
        currentOffset,
        undefined,
        filter
      );

      if (response.success) {
        const newNotifications = response.data;
        
        if (append) {
          setNotifications(prev => [...prev, ...newNotifications]);
        } else {
          // Merge with live notifications (avoid duplicates)
          const merged = [...liveNotifications];
          newNotifications.forEach((notif: NotificationType) => {
            if (!merged.find(n => n.id === notif.id)) {
              merged.push(notif);
            }
          });
          setNotifications(merged);
        }
        
        setHasMore(response.has_more || false);
        setOffset(currentOffset);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [liveNotifications]);

  // Load notifications when panel opens
  useEffect(() => {
    if (isOpen) {
      loadNotifications(timeFilter, 0, false);
    }
  }, [isOpen, timeFilter, loadNotifications]);

  // Update notifications when new live notifications arrive
  useEffect(() => {
    if (liveNotifications.length > 0 && isOpen) {
      setNotifications(prev => {
        const merged = [...liveNotifications];
        prev.forEach(notif => {
          if (!merged.find(n => n.id === notif.id)) {
            merged.push(notif);
          }
        });
        return merged.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });
    }
  }, [liveNotifications, isOpen]);

  const handleLoadMore = () => {
    loadNotifications(timeFilter, offset + LIMIT, true);
  };

  const handleSwitchToOlder = () => {
    setTimeFilter('older');
    setOffset(0);
  };

  const handleNotificationClick = (notificationId: number, isRead: boolean) => {
    if (!isRead) {
      onMarkAsRead(notificationId);
    }
  };

  const getNotificationIcon = (type: string) => {
    const icons: Record<string, string> = {
      booking_created: '📅',
      booking_updated: '✏️',
      booking_cancelled: '❌',
      room_updated: '🏠',
      room_maintenance: '🔧',
      room_occupied: '🔑',
    };
    return icons[type] || '📢';
  };

  const getNotificationColor = (type: string) => {
    const colors: Record<string, string> = {
      booking_created: 'bg-green-50 border-green-200',
      booking_updated: 'bg-blue-50 border-blue-200',
      booking_cancelled: 'bg-red-50 border-red-200',
      room_updated: 'bg-purple-50 border-purple-200',
      room_maintenance: 'bg-orange-50 border-orange-200',
      room_occupied: 'bg-yellow-50 border-yellow-200',
    };
    return colors[type] || 'bg-gray-50 border-gray-200';
  };

  // Group notifications by time
  const groupedNotifications = notifications.reduce((acc, notif) => {
    const date = new Date(notif.created_at);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    let group: string;
    if (diffDays === 0) group = 'Today';
    else if (diffDays <= 7) group = 'Last 7 days';
    else if (diffDays <= 30) group = 'Older';
    else group = 'Archive';
    
    if (!acc[group]) acc[group] = [];
    acc[group].push(notif);
    return acc;
  }, {} as Record<string, NotificationType[]>);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative bg-transparent hover:bg-gray-50"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center p-0">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-96 p-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-base">Notifications</h3>
              {!isConnected && (
                <Badge variant="destructive" className="text-xs">
                  Offline
                </Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs hover:bg-gray-100"
                onClick={onMarkAllAsRead}
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="h-[250px]" ref={scrollRef}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Bell className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500 font-medium">No notifications yet</p>
              <p className="text-xs text-gray-400 mt-1">
                You'll see updates about bookings and rooms here
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {Object.entries(groupedNotifications).map(([group, groupNotifs]) => (
                <div key={group}>
                  <div className="px-4 py-2 bg-gray-50 sticky top-0">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      {group}
                    </p>
                  </div>
                  {groupNotifs.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        'px-4 py-3 hover:bg-gray-50 cursor-pointer transition-all border-l-2',
                        !notification.is_read && 'bg-blue-50/50',
                        getNotificationColor(notification.type)
                      )}
                      onClick={() => handleNotificationClick(notification.id, notification.is_read)}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="font-medium text-sm text-gray-900 line-clamp-1">
                              {notification.title}
                            </p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(notification.id);
                              }}
                              className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <p className="text-xs text-gray-600 line-clamp-2 mb-1.5">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-gray-400">
                              {formatDistanceToNow(new Date(notification.created_at), {
                                addSuffix: true,
                              })}
                            </p>
                            {!notification.is_read && (
                              <Badge className="h-1.5 w-1.5 rounded-full bg-blue-500 p-0" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Load More Buttons */}
          {!loading && notifications.length > 0 && (
            <div className="p-4 space-y-2">
              {hasMore && timeFilter === 'new' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin mr-2" />
                      Loading...
                    </>
                  ) : (
                    'Load more from last 7 days'
                  )}
                </Button>
              )}
              
              {timeFilter === 'new' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={handleSwitchToOlder}
                >
                  View older notifications (30 days)
                </Button>
              )}
              
              {hasMore && timeFilter === 'older' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin mr-2" />
                      Loading...
                    </>
                  ) : (
                    'Load more from last 30 days'
                  )}
                </Button>
              )}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};