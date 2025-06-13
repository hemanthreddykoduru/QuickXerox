import React, { useState } from 'react';
import { Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Order, OrderStatus } from '../../types';

interface TodayOrdersProps {
  orders: Order[];
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void;
}

const TodayOrders: React.FC<TodayOrdersProps> = ({ orders, onStatusChange }) => {
  const [sortBy, setSortBy] = useState<'time' | 'amount'>('time');
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');

  // Filter orders for today
  const today = new Date().toISOString().split('T')[0];
  const todayOrders = orders.filter(order => 
    order.timestamp.startsWith(today)
  );

  // Apply status filter
  const filteredOrders = todayOrders.filter(order => {
    if (filter === 'all') return true;
    return order.status === filter;
  });

  // Sort orders
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (sortBy === 'time') {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    } else {
      return b.total - a.total;
    }
  });

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'processing':
        return <AlertCircle className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <XCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Today's Orders</h2>
        <div className="flex space-x-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as OrderStatus | 'all')}
            className="border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Filter orders by status"
          >
            <option value="all">All Orders</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'time' | 'amount')}
            className="border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Sort orders by"
          >
            <option value="time">Sort by Time</option>
            <option value="amount">Sort by Amount</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Order ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedOrders.map((order) => (
              <tr key={order.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  #{order.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {order.customerName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(order.timestamp).toLocaleTimeString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  ₹{order.total.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(order.status)}`}>
                    {getStatusIcon(order.status)}
                    <span className="ml-1">{order.status}</span>
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <select
                    value={order.status}
                    onChange={(e) => onStatusChange(order.id, e.target.value as OrderStatus)}
                    className="border border-gray-300 rounded-md shadow-sm py-1 px-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label={`Change status for order ${order.id}`}
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sortedOrders.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No orders found for today</p>
        </div>
      )}
    </div>
  );
};

export default TodayOrders; 