import React from 'react';
import { Printer, FileText, Clock, Shield, Eye, X } from 'lucide-react';
import { Order } from '../../types';
import Skeleton from '../common/Skeleton';


interface OrderHistoryProps {
  orders: (Order & { otp?: string })[];
  isLoading?: boolean;
  userEmail?: string;
}

const OrderHistory: React.FC<OrderHistoryProps> = ({ orders, isLoading }) => {
  const [currentPage, setCurrentPage] = React.useState(1);
  const ITEMS_PER_PAGE = 5;

  const totalPages = Math.ceil(orders.length / ITEMS_PER_PAGE);
  const getPaginatedOrders = () => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return orders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  };

  const paginatedOrders = getPaginatedOrders();

  // handleInvoice function removed

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
          paginatedOrders.map((order) => (
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
                    {order.paymentId && (
                      <p className="text-xs text-gray-400 mt-1">
                        Payment ID: <span className="font-mono">{order.paymentId}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress Tracking Bar */}
              {order.status !== 'rejected' ? (
                <div className="my-6 px-2 sm:px-6">
                  <div className="relative">
                    {/* 
                        To keep the line exactly horizontally centered between the circles,
                        we inset it by half the width of a circle. 
                        Circles are w-8 sm:w-10 (2rem or 2.5rem). 
                        Half of 2rem is 1rem (16px). Half of 2.5rem is 1.25rem (20px).
                    */}
                    <div className="absolute top-4 sm:top-5 left-[1rem] right-[1rem] sm:left-[1.25rem] sm:right-[1.25rem] h-1 bg-[#4e5e65] -translate-y-1/2 rounded">
                      {/* Active tracking line (Fills parent based on percentage) */}
                      <div
                        className="h-full bg-[#48b4a2] rounded transition-all duration-500"
                        style={{
                          width: order.status === 'completed' ? '100%' :
                            order.status === 'processing' ? '50%' : '0%'
                        }}
                      ></div>
                    </div>

                    {/* Nodes */}
                    <div className="relative flex justify-between">
                      {/* Step 1: Pending (Placed) */}
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-base font-medium z-10 transition-colors ${['pending', 'processing', 'completed'].includes(order.status)
                          ? 'bg-[#48b4a2] text-white'
                          : 'bg-[#4e5e65] text-white'
                          }`}>
                          1
                        </div>
                        <span className={`mt-3 text-[10px] sm:text-xs font-semibold tracking-widest uppercase ${['pending', 'processing', 'completed'].includes(order.status) ? 'text-[#4e5e65]' : 'text-[#4e5e65]'
                          }`}>PLACED</span>
                      </div>

                      {/* Step 2: Processing (Printing) */}
                      <div className="flex flex-col items-center" style={{ width: '40px' }}>
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-base font-medium z-10 transition-colors ${['processing', 'completed'].includes(order.status)
                          ? 'bg-[#48b4a2] text-white'
                          : 'bg-[#4e5e65] text-white'
                          }`}>
                          2
                        </div>
                        {/* the label container needs positioning or absolute to prevent it from altering the flex gap */}
                        <div className="absolute top-12 sm:top-14 mt-1 text-center whitespace-nowrap">
                          <span className={`text-[10px] sm:text-xs font-semibold tracking-widest uppercase ${['processing', 'completed'].includes(order.status) ? 'text-[#4e5e65]' : 'text-[#4e5e65]'
                            }`}>PROCESSING</span>
                        </div>
                      </div>

                      {/* Step 3: Completed (Ready) */}
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-base font-medium z-10 transition-colors ${order.status === 'completed'
                          ? 'bg-[#48b4a2] text-white'
                          : 'bg-[#4e5e65] text-white'
                          }`}>
                          3
                        </div>
                        <div className="mt-3 relative flex justify-center w-full">
                          <span className={`absolute text-[10px] sm:text-xs font-semibold tracking-widest uppercase ${order.status === 'completed' ? 'text-[#4e5e65]' : 'text-[#4e5e65]'
                            }`}>READY</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Since labels are absolute now to not disrupt grid spacing, we need a spacer */}
                  <div className="h-8 sm:h-10"></div>
                </div>
              ) : (
                <div className="my-4 p-3 bg-red-50 rounded-lg text-center">
                  <span className="text-red-700 font-medium flex justify-center items-center">
                    <X className="h-5 w-5 mr-1" /> Order Rejected
                  </span>
                </div>
              )}

              <div className="space-y-2 sm:space-y-3 mt-4">
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
                    {order.status === 'completed'
                      ? order.completedAt
                        ? `Completed on ${new Date(order.completedAt).toLocaleString('en-US', {
                          month: 'numeric',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}`
                        : 'Completed'
                      : order.status === 'rejected'
                        ? 'Order Cancelled'
                        : 'Expected in 15-20 mins'}
                  </span>
                </div>
                <p className="font-medium text-gray-900 text-sm sm:text-base">
                  ₹{order.total.toFixed(2)}
                </p>
              </div>

              {/* View Invoice Button */}
              {order.invoiceUrl && (
                <div className="mt-3 flex justify-end">
                  <a
                    href={order.invoiceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                    <span>View Invoice</span>
                  </a>
                </div>
              )}

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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between sm:px-6">
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, orders.length)}</span> of <span className="font-medium">{orders.length}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  <span className="sr-only">Previous</span>
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${currentPage === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  <span className="sr-only">Next</span>
                  Next
                </button>
              </nav>
            </div>
          </div>
          <div className="flex flex-col sm:hidden w-full gap-3">
            <div className="flex justify-between items-center w-full">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={`relative inline-flex items-center justify-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 flex-1 mr-2 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`relative inline-flex items-center justify-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 flex-1 ml-2 ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Next
              </button>
            </div>
            <p className="text-xs text-center text-gray-500">
              Page {currentPage} of {totalPages}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderHistory;