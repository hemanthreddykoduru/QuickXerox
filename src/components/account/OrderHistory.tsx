import React, { useState } from 'react';
import { Clock, Printer, FileText, Shield, CheckCircle, Copy, Eye, EyeOff } from 'lucide-react';
import { Order } from '../../types';
import { toast } from 'react-hot-toast';

interface OrderHistoryProps {
  orders: Order[];
}

const OrderHistory: React.FC<OrderHistoryProps> = ({ orders }) => {
  const [showOTP, setShowOTP] = useState<{ [key: string]: boolean }>({});

  const toggleOTPVisibility = (orderId: string) => {
    setShowOTP(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  const getStoredOTP = (orderId: string) => {
    return localStorage.getItem(`otp_${orderId}`) || '';
  };

  const copyOTP = (otp: string) => {
    navigator.clipboard.writeText(otp);
    toast.success('OTP copied to clipboard!');
  };

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
        {orders.length === 0 ? (
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
                      {new Date(order.timestamp).toLocaleDateString()}
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
              {order.status === 'processing' && order.isPaid && getStoredOTP(order.id) && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Shield className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-gray-900">Your Verification Code</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => toggleOTPVisibility(order.id)}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                        title={showOTP[order.id] ? "Hide OTP" : "Show OTP"}
                      >
                        {showOTP[order.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => copyOTP(getStoredOTP(order.id))}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                        title="Copy OTP"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex justify-center space-x-2 mb-3">
                    {getStoredOTP(order.id).split('').map((digit, index) => (
                      <div
                        key={index}
                        className="w-10 h-10 border-2 border-blue-300 bg-white rounded-lg flex items-center justify-center"
                      >
                        <span className="text-lg font-bold text-blue-600">
                          {showOTP[order.id] ? digit : '•'}
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