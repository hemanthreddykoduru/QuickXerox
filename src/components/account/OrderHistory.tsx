import React from 'react';
import { Clock, Printer, FileText } from 'lucide-react';
import { Order } from '../../types';

interface OrderHistoryProps {
  orders: Order[];
}

const OrderHistory: React.FC<OrderHistoryProps> = ({ orders }) => {
  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Order History</h2>
      </div>

      <div className="divide-y divide-gray-200">
        {orders.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No orders yet
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Printer className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">Order #{order.id}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(order.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
              </div>

              <div className="space-y-3">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{item.fileName}</p>
                      <p className="text-sm text-gray-500">
                        {item.copies} {item.copies === 1 ? 'copy' : 'copies'} • 
                        {item.isColor ? ' Color' : ' B&W'} • 
                        {item.pages} pages
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-500">
                    {order.status === 'completed' ? 'Completed' : 'Expected'} in 15-20 mins
                  </span>
                </div>
                <p className="font-medium text-gray-900">
                  ${order.total.toFixed(2)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default OrderHistory;