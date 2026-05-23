/** Count unread order-status notifications from a set of order documents. */
export function countUnreadOrderNotifications(
  orders: Map<string, Record<string, unknown>>,
  readNotifications: string[]
): number {
  let count = 0;
  orders.forEach((order, orderId) => {
    if (order.status === 'pending' && order.isPaid === true) {
      if (!readNotifications.includes(`order-pending-${orderId}`)) count++;
    }
    if (order.status === 'processing') {
      if (!readNotifications.includes(`order-processing-${orderId}`)) count++;
    }
    if (order.status === 'completed') {
      if (!readNotifications.includes(`order-completed-${orderId}`)) count++;
    }
    if (order.status === 'rejected') {
      if (!readNotifications.includes(`order-rejected-${orderId}`)) count++;
    }
  });
  return count;
}
