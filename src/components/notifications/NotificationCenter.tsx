import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, AlertCircle, Clock, Package, PackageCheck, ChevronRight, Trash2 } from 'lucide-react';
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
  const [deletedIds, setDeletedIds] = useState<string[]>(() => {
    return JSON.parse(localStorage.getItem('deleted_notifications') || '[]');
  });

  // Type-safe motion components workaround
  const MotionDiv = motion.div as any;
  const MotionButton = motion.button as any;

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const readNotifications = JSON.parse(localStorage.getItem('read_notifications') || '[]');
    const currentDeletedIds = JSON.parse(localStorage.getItem('deleted_notifications') || '[]');

    const ordersQuery = query(
      collection(db, 'orders'),
      where('customerId', '==', currentUser.uid),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const orderNotifications: Notification[] = [];

      snapshot.forEach((doc) => {
        const order = doc.data();
        const orderId = doc.id;

        // Skip if deleted
        if (currentDeletedIds.includes(`order-pending-${orderId}`) ||
          currentDeletedIds.includes(`order-processing-${orderId}`) ||
          currentDeletedIds.includes(`order-completed-${orderId}`) ||
          currentDeletedIds.includes(`order-rejected-${orderId}`)) {
          return;
        }

        const timestamp = order.timestamp || new Date().toISOString();

        let notification: Notification | null = null;

        if (order.status === 'pending' && order.isPaid === true) {
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
            message: `Order #${orderId.slice(-6)} is being processed by ${order.shopName || 'the shop'}`,
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
            message: `Order #${orderId.slice(-6)} is ready! Pick it up from ${order.shopName || 'the shop'}`,
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
            message: `Order #${orderId.slice(-6)} was rejected by ${order.shopName || 'the shop'}`,
            timestamp: timestamp,
            isRead: readNotifications.includes(`order-rejected-${orderId}`),
            actionUrl: `/customer/orders/${orderId}`,
            actionText: 'View Order',
            orderId
          };
        }

        if (notification) orderNotifications.push(notification);
      });

      orderNotifications.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setNotifications(orderNotifications);
      setUnreadCount(orderNotifications.filter(n => !n.isRead).length);
    });

    return () => unsubscribe();
  }, [deletedIds]);

  const deleteNotification = (notificationId: string) => {
    const updatedDeletedIds = [...deletedIds, notificationId];
    setDeletedIds(updatedDeletedIds);
    localStorage.setItem('deleted_notifications', JSON.stringify(updatedDeletedIds));
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    toast.success('Notification removed');
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

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <PackageCheck className="h-5 w-5 text-emerald-500" />;
      case 'warning':
        return <Package className="h-5 w-5 text-amber-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-rose-500" />;
      default:
        return <Clock className="h-5 w-5 text-indigo-500" />;
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

  return ReactDOM.createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <MotionDiv
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            <MotionDiv
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative bg-white/95 backdrop-blur-xl w-full sm:max-w-2xl h-[85vh] sm:h-auto sm:max-h-[calc(100vh-32px)] rounded-t-3xl sm:rounded-3xl shadow-2xl border-t sm:border border-slate-200/50 flex flex-col overflow-hidden"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 bg-white/50 backdrop-blur-md z-10 px-6 py-4 border-b border-slate-100 flex-shrink-0">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-indigo-50 rounded-lg">
                      <Bell className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Notifications</h2>
                      <p className="text-sm text-slate-500 mt-0.5">
                        {unreadCount > 0 ? `${unreadCount} unread updates` : 'All caught up!'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {unreadCount > 0 && (
                      <MotionButton
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={markAllAsRead}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-full transition-colors"
                      >
                        Mark all read
                      </MotionButton>
                    )}
                    <button
                      onClick={onClose}
                      className="text-slate-400 hover:text-slate-900 p-2 hover:bg-slate-100 rounded-full transition-all duration-200"
                      aria-label="Close notifications"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Notifications List */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0 flex-grow scroll-smooth">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 px-4">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                      <Bell className="h-10 w-10 text-slate-300" />
                    </div>
                    <p className="text-slate-500 font-bold text-lg">No notifications yet</p>
                    <p className="text-sm text-slate-400 text-center mt-2 max-w-xs">
                      Place your first order to start receiving real-time status updates!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <AnimatePresence mode="popLayout">
                      {notifications.map((notification) => (
                        <MotionDiv
                          layout
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          key={notification.id}
                          className={`group relative p-4 rounded-xl border transition-all duration-200 ${notification.isRead
                              ? 'bg-slate-50/50 border-slate-100 opacity-75'
                              : 'bg-white border-slate-200 shadow-sm hover:shadow-md'
                            }`}
                        >
                          <div className="flex items-start space-x-4">
                            <div className="flex-shrink-0 mt-0.5">
                              <div className={`p-2 rounded-lg ${notification.isRead ? 'bg-slate-100' : 'bg-indigo-50'}`}>
                                {getNotificationIcon(notification.type)}
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h4 className={`text-sm font-bold tracking-tight ${notification.isRead ? 'text-slate-600' : 'text-slate-900'}`}>
                                  {notification.title}
                                </h4>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                  {formatTimestamp(notification.timestamp)}
                                </span>
                              </div>

                              <p className={`text-sm mt-1 leading-relaxed ${notification.isRead ? 'text-slate-500' : 'text-slate-600'}`}>
                                {notification.message}
                              </p>

                              <div className="mt-3 flex items-center justify-between">
                                {notification.actionUrl && (
                                  <button
                                    onClick={() => window.location.href = notification.actionUrl!}
                                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center"
                                  >
                                    View Details
                                    <ChevronRight className="h-3 w-3 ml-1" />
                                  </button>
                                )}
                                <button
                                  onClick={() => deleteNotification(notification.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                  title="Delete notification"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </MotionDiv>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-white/80 backdrop-blur-lg border-t border-slate-100 p-4 sm:p-6 mt-auto flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                    <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">
                      {notifications.length} Notification{notifications.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {notifications.length > 0 && (
                    <MotionButton
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={markAllAsRead}
                      className="text-[10px] sm:text-xs font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-tighter bg-indigo-50/50 px-3 py-1.5 rounded-lg transition-all"
                    >
                      Mark all as read
                    </MotionButton>
                  )}
                </div>
              </div>
            </MotionDiv>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.getElementById('modal-root')!
  );
};

export default NotificationCenter;
