import React, { useState, useEffect } from 'react';
import { Bell, X, Check, AlertCircle, Info, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  actionUrl?: string;
  actionText?: string;
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Load notifications from localStorage or API
    const savedNotifications = localStorage.getItem('quickxerox_notifications');
    if (savedNotifications) {
      const parsed = JSON.parse(savedNotifications);
      setNotifications(parsed);
      setUnreadCount(parsed.filter((n: Notification) => !n.isRead).length);
    } else {
      // Initialize with sample notifications
      const sampleNotifications: Notification[] = [
        {
          id: '1',
          type: 'success',
          title: 'Order Completed',
          message: 'Your print order #12345 is ready for pickup',
          timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          isRead: false,
          actionUrl: '/orders/12345',
          actionText: 'View Order'
        },
        {
          id: '2',
          type: 'info',
          title: 'New Print Shop Available',
          message: 'A new print shop has opened near your location',
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          isRead: false
        },
        {
          id: '3',
          type: 'warning',
          title: 'Payment Pending',
          message: 'Your payment for order #12344 is still pending',
          timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          isRead: true,
          actionUrl: '/payment/12344',
          actionText: 'Complete Payment'
        }
      ];
      setNotifications(sampleNotifications);
      setUnreadCount(2);
      localStorage.setItem('quickxerox_notifications', JSON.stringify(sampleNotifications));
    }
  }, []);

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => 
        n.id === notificationId ? { ...n, isRead: true } : n
      );
      localStorage.setItem('quickxerox_notifications', JSON.stringify(updated));
      return updated;
    });
    setUnreadCount(prev => prev - 1);
  };

  const markAllAsRead = () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, isRead: true }));
      localStorage.setItem('quickxerox_notifications', JSON.stringify(updated));
      return updated;
    });
    setUnreadCount(0);
    toast.success('All notifications marked as read');
  };

  const deleteNotification = (notificationId: string) => {
    setNotifications(prev => {
      const updated = prev.filter(n => n.id !== notificationId);
      localStorage.setItem('quickxerox_notifications', JSON.stringify(updated));
      return updated;
    });
    toast.success('Notification deleted');
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getNotificationBgColor = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Bell className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No notifications yet</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg border ${
                  notification.isRead 
                    ? 'bg-gray-50 border-gray-200' 
                    : getNotificationBgColor(notification.type)
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className={`text-sm font-medium ${
                        notification.isRead ? 'text-gray-600' : 'text-gray-900'
                      }`}>
                        {notification.title}
                      </h4>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(notification.timestamp)}
                        </span>
                        {!notification.isRead && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="text-gray-400 hover:text-gray-600"
                            title="Mark as read"
                            aria-label="Mark as read"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="text-gray-400 hover:text-gray-600"
                          title="Delete notification"
                          aria-label="Delete notification"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    <p className={`text-sm mt-1 ${
                      notification.isRead ? 'text-gray-500' : 'text-gray-700'
                    }`}>
                      {notification.message}
                    </p>
                    
                    {notification.actionUrl && notification.actionText && (
                      <button className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                        {notification.actionText}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {notifications.length} total notifications
            </p>
            <button
              onClick={() => {
                setNotifications([]);
                setUnreadCount(0);
                localStorage.removeItem('quickxerox_notifications');
                toast.success('All notifications cleared');
              }}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Clear All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;
