import React, { useState, useEffect } from 'react';
import { Bell, X, Check, AlertCircle, Info, CheckCircle, Clock, Package, PackageCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../../firebase';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  actionUrl?: string;
  actionText?: string;
  orderId?: string;
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    // Load read notifications from localStorage
    const readNotifications = JSON.parse(localStorage.getItem('read_notifications') || '[]');

    // Listen to real-time order changes for this customer
    const ordersQuery = query(
      collection(db, 'orders'),
      where('customerId', '==', currentUser.uid),
      orderBy('timestamp', 'desc'),
      limit(20) // Only show last 20 orders
    );

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const orderNotifications: Notification[] = [];

      snapshot.forEach((doc) => {
        const order = doc.data();
        const orderId = doc.id;
        const timestamp = order.timestamp || new Date().toISOString();

        // Create notification based on order status
        let notification: Notification | null = null;

        if (order.status === 'pending' && order.paymentStatus === 'success') {
          notification = {
            id: `order-pending-${orderId}`,
            type: 'info',
            title: 'New Order Placed',
            message: `Order #${orderId.slice(-6)} has been placed and is waiting for shop confirmation`,
            timestamp: timestamp,
            isRead: readNotifications.includes(`order-pending-${orderId}`),
            actionUrl: `/customer/orders/${orderId}`,
            actionText: 'View Order',
            orderId
          };
        } else if (order.status === 'processing') {
          notification = {
            id: `order-processing-${orderId}`,
            type: 'warning',
            title: 'Order Accepted',
            message: `Order #${orderId.slice(-6)} is being processed by ${order.shopName}`,
            timestamp: timestamp,
            isRead: readNotifications.includes(`order-processing-${orderId}`),
            actionUrl: `/customer/orders/${orderId}`,
            actionText: 'View Order',
            orderId
          };
        } else if (order.status === 'completed') {
          notification = {
            id: `order-completed-${orderId}`,
            type: 'success',
            title: 'Order Ready for Pickup',
            message: `Order #${orderId.slice(-6)} is ready! Pick it up from ${order.shopName}`,
            timestamp: order.completedAt || timestamp,
            isRead: readNotifications.includes(`order-completed-${orderId}`),
            actionUrl: `/customer/orders/${orderId}`,
            actionText: 'View Order',
            orderId
          };
        } else if (order.status === 'rejected') {
          notification = {
            id: `order-rejected-${orderId}`,
            type: 'error',
            title: 'Order Rejected',
            message: `Order #${orderId.slice(-6)} was rejected by the shop`,
            timestamp: timestamp,
            isRead: readNotifications.includes(`order-rejected-${orderId}`),
            actionUrl: `/customer/orders/${orderId}`,
            actionText: 'View Order',
            orderId
          };
        }

        if (notification) {
          orderNotifications.push(notification);
        }
      });

      // Sort by timestamp (newest first)
      orderNotifications.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setNotifications(orderNotifications);
      setUnreadCount(orderNotifications.filter(n => !n.isRead).length);
    });

    return () => unsubscribe();
  }, []);

  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, isRead: true } : n
      )
    );

    // Save to localStorage
    const readNotifications = JSON.parse(localStorage.getItem('read_notifications') || '[]');
    if (!readNotifications.includes(notificationId)) {
      readNotifications.push(notificationId);
      localStorage.setItem('read_notifications', JSON.stringify(readNotifications));
    }

    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));

    const readNotifications = JSON.parse(localStorage.getItem('read_notifications') || '[]');
    const updatedRead = [...new Set([...readNotifications, ...allIds])];
    localStorage.setItem('read_notifications', JSON.stringify(updatedRead));

    setUnreadCount(0);
    toast.success('All notifications marked as read');
  };

  const deleteNotification = (notificationId: string) => {
    // Mark as read instead of deleting (since these are real orders)
    markAsRead(notificationId);
    toast.success('Notification marked as read');
  };

  const clearAll = () => {
    // Just mark all as read
    markAllAsRead();
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <PackageCheck className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <Package className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-blue-500" />;
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
              <p className="text-gray-500">No order notifications yet</p>
              <p className="text-sm text-gray-400 mt-2">
                Place your first order to start receiving updates!
              </p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg border ${notification.isRead
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
                      <h4 className={`text-sm font-medium ${notification.isRead ? 'text-gray-600' : 'text-gray-900'
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
                          title="Dismiss"
                          aria-label="Dismiss"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <p className={`text-sm mt-1 ${notification.isRead ? 'text-gray-500' : 'text-gray-700'
                      }`}>
                      {notification.message}
                    </p>

                    {notification.actionUrl && notification.actionText && (
                      <button
                        onClick={() => {
                          // In a real app, navigate to the order page
                          window.location.href = notification.actionUrl;
                        }}
                        className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        {notification.actionText} →
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
              {notifications.length} order notification{notifications.length !== 1 ? 's' : ''}
            </p>
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Mark All Read
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;
