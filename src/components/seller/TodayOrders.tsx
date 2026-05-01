import React, { useState } from 'react';
import { Clock, CheckCircle, XCircle, AlertCircle, User, FileText } from 'lucide-react';
import { Order, OrderStatus } from '../../types';
import Skeleton from '../common/Skeleton';

interface TodayOrdersProps {
  orders: Order[];
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void;
  isLoading?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string; icon: React.ReactNode }> = {
  pending:    { label: 'Pending',    bg: 'bg-yellow-50',  text: 'text-yellow-800', dot: 'bg-yellow-500', icon: <Clock className="h-3.5 w-3.5" /> },
  processing: { label: 'Ready',     bg: 'bg-blue-50',    text: 'text-blue-800',   dot: 'bg-blue-500',   icon: <AlertCircle className="h-3.5 w-3.5" /> },
  completed:  { label: 'Completed', bg: 'bg-green-50',   text: 'text-green-800',  dot: 'bg-green-500',  icon: <CheckCircle className="h-3.5 w-3.5" /> },
  rejected:   { label: 'Rejected',  bg: 'bg-red-50',     text: 'text-red-800',    dot: 'bg-red-500',    icon: <XCircle className="h-3.5 w-3.5" /> },
};

const TodayOrders: React.FC<TodayOrdersProps> = ({ orders, onStatusChange, isLoading }) => {
  const [sortBy, setSortBy] = useState<'time' | 'amount'>('time');
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');

  // Filter orders for today
  const today = new Date().toISOString().split('T')[0];
  const todayOrders = orders.filter(order => order.timestamp.startsWith(today));

  const filteredOrders = todayOrders.filter(order =>
    filter === 'all' ? true : order.status === filter
  );

  const sortedOrders = [...filteredOrders].sort((a, b) =>
    sortBy === 'time'
      ? new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      : b.total - a.total
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Today's Orders</h2>
          <p className="text-xs text-gray-400 mt-0.5">{sortedOrders.length} order{sortedOrders.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as OrderStatus | 'all')}
            className="border border-gray-200 rounded-lg py-1.5 px-3 bg-white text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Filter orders by status"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="processing">Ready</option>
            <option value="completed">Completed</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'time' | 'amount')}
            className="border border-gray-200 rounded-lg py-1.5 px-3 bg-white text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Sort orders by"
          >
            <option value="time">By Time</option>
            <option value="amount">By Amount</option>
          </select>
        </div>
      </div>

      {/* ── Order Cards ─────────────────────────────────────────────── */}
      <div className="p-4 sm:p-5 space-y-4">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-3 animate-pulse">
              <div className="flex justify-between">
                <div className="flex items-center space-x-3">
                  <Skeleton width={36} height={36} variant="circular" />
                  <div className="space-y-1.5">
                    <Skeleton width={120} height={16} />
                    <Skeleton width={80} height={12} />
                  </div>
                </div>
                <Skeleton width={72} height={24} className="rounded-full" />
              </div>
              <Skeleton width="70%" height={14} />
              <div className="flex justify-between items-center">
                <Skeleton width={60} height={18} />
                <Skeleton width={100} height={32} className="rounded-lg" />
              </div>
            </div>
          ))
        ) : sortedOrders.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="h-9 w-9 mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-medium text-gray-400">No orders today</p>
          </div>
        ) : (
          sortedOrders.map((order) => {
            const s = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
            return (
              <div key={order.id} className="border border-gray-200 rounded-xl shadow-sm bg-white overflow-hidden">

                {/* Card Header */}
                <div className="flex items-start justify-between px-4 pt-4 pb-3 border-b border-gray-100">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="flex-shrink-0 p-2 bg-indigo-50 rounded-lg">
                      <User className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">#{order.id}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{order.customerName}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(order.timestamp).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}
                      </p>
                    </div>
                  </div>
                  <span className={`flex-shrink-0 ml-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                    {s.label}
                  </span>
                </div>

                {/* File items */}
                <div className="px-4 py-3 space-y-1.5">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center space-x-2 bg-gray-50 rounded-lg px-3 py-2">
                      <FileText className="h-3.5 w-3.5 flex-shrink-0 text-indigo-400" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">{item.fileName}</p>
                        <p className="text-[10px] text-gray-500">
                          {item.copies} {item.copies === 1 ? 'copy' : 'copies'} · {item.isColor ? 'Color' : 'B&W'} · {item.pages} {item.pages === 1 ? 'page' : 'pages'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer: amount + status change */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-100 gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">₹{order.total.toFixed(2)}</span>
                    {order.isPaid && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-800">
                        Paid
                      </span>
                    )}
                  </div>
                  <select
                    value={order.status}
                    onChange={(e) => onStatusChange(order.id, e.target.value as OrderStatus)}
                    className="border border-gray-200 rounded-lg py-1.5 px-2.5 bg-white text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    aria-label={`Change status for order ${order.id}`}
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Mark Ready</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TodayOrders;