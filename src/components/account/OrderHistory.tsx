import React from 'react';
import { Printer, FileText, Clock, Shield } from 'lucide-react';
import { Order } from '../../types';
import Skeleton from '../common/Skeleton';

interface OrderHistoryProps {
  orders: (Order & { otp?: string })[];
  isLoading?: boolean;
}

const OrderHistory: React.FC<OrderHistoryProps> = ({ orders, isLoading }) => {



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
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Order History</h2>
      </div>

      <div className="divide-y divide-gray-200">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="p-4 sm:p-6 space-y-4">
              <div className="flex justify-between">
                <div className="flex space-x-3 w-1/2">
                  <Skeleton width={20} height={20} variant="circular" />
                  <div className="w-full space-y-2">
                    <Skeleton width="60%" height={20} />
                    <Skeleton width="40%" height={16} />
                  </div>
                </div>
                <Skeleton width={80} height={24} className="rounded-full" />
              </div>
              <div className="space-y-3">
                <div className="flex space-x-3">
                  <Skeleton width={20} height={20} variant="circular" />
                  <div className="w-3/4 space-y-1">
                    <Skeleton width="50%" height={16} />
                    <Skeleton width="30%" height={12} />
                  </div>
                </div>
              </div>
              <div className="flex justify-between pt-2">
                <Skeleton width={120} height={16} />
                <Skeleton width={60} height={20} />
              </div>
            </div>
          ))
        ) : orders.length === 0 ? (
          <div className="p-4 sm:p-6 text-center text-gray-500">
            No orders yet
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <Printer className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900 text-sm sm:text-base">Order #{order.id}</p>
                    <p className="text-xs sm:text-sm text-gray-500">
                      {new Date(order.timestamp).toLocaleString('en-US', {
                        month: '2-digit',
                        day: '2-digit',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-medium ${getStatusColor(order.status)}`}>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
              </div>

              <div className="space-y-2 sm:space-y-3">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center space-x-2 sm:space-x-3">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                    <div className="flex-1">
                      <p className="text-xs sm:text-sm font-medium text-gray-900">{item.fileName}</p>
                      <p className="text-xs sm:text-sm text-gray-500">
                        {item.copies} {item.copies === 1 ? 'copy' : 'copies'} •
                        {item.isColor ? ' Color' : ' B&W'} •
                        {item.pages} pages
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 sm:mt-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  <span className="text-xs sm:text-sm text-gray-500">
                    {order.status === 'completed' ? 'Completed' : 'Expected'} in 15-20 mins
                  </span>
                </div>
                <p className="font-medium text-gray-900 text-sm sm:text-base">
                  ₹{order.total.toFixed(2)}
                </p>
              </div>

              {/* OTP Display Section */}
              {order.status === 'processing' && order.isPaid && order.otp && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center space-x-2 mb-3">
                    <Shield className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-900">Your Verification Code</span>
                  </div>

                  <div className="flex justify-center space-x-2 mb-3">
                    {(order.otp || '').split('').map((digit, index) => (
                      <div
                        key={index}
                        className="w-10 h-10 border-2 border-blue-300 bg-white rounded-lg flex items-center justify-center"
                      >
                        <span className="text-lg font-bold text-blue-600">
                          {digit}
                        </span>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-gray-500 text-center">
                    Show this code to the seller when collecting your prints
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

    </div>
  );
};

export default OrderHistory;