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
  const [activeTab, setActiveTab] = React.useState<'all' | 'pending' | 'processing' | 'completed'>('all');
  const ITEMS_PER_PAGE = 5;

  const filteredOrders = orders.filter(order => {
    if (activeTab === 'all') return true;
    return order.status === activeTab;
  });

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const getPaginatedOrders = () => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  };

  const paginatedOrders = getPaginatedOrders();

  // handleInvoice function removed

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Order History</h2>
      </div>

      {/* Status Tabs */}
      <div className="flex border-b border-gray-100 bg-gray-50/50 p-1">
        {[
          { id: 'all', label: 'ALL' },
          { id: 'pending', label: 'PLACED' },
          { id: 'processing', label: 'READY' },
          { id: 'completed', label: 'DONE' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any);
              setCurrentPage(1);
            }}
            className={`flex-1 py-2.5 text-[10px] sm:text-xs font-black tracking-widest transition-all duration-200 rounded-md ${activeTab === tab.id
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-400 hover:text-gray-600'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-4 sm:p-6 space-y-4">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="border border-gray-200 rounded-xl p-4 sm:p-5 space-y-4 animate-pulse">
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
        ) : filteredOrders.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <Printer className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No {activeTab !== 'all' ? activeTab : ''} orders found</p>
          </div>
        ) : (
          paginatedOrders.map((order) => {
            const currentStatus = (order.status || 'pending').toLowerCase();
            const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
              pending:    { label: 'Placed',     bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-500' },
              processing: { label: 'Ready',      bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-500' },
              ready:      { label: 'Ready',      bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-500' },
              completed:  { label: 'Completed',  bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500' },
              rejected:   { label: 'Cancelled',  bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500' },
              cancelled:  { label: 'Cancelled',  bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500' },
              failed:     { label: 'Failed',     bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500' },
            };
            const s = statusConfig[currentStatus] ?? { label: order.status, bg: 'bg-gray-50', text: 'text-gray-700', dot: 'bg-gray-400' };

            return (
              <div
                key={order.id}
                className="border border-gray-200 rounded-xl shadow-sm bg-white overflow-hidden"
              >
                {/* ── Card Header ──────────────────────────────────────── */}
                <div className="flex items-start justify-between px-4 pt-4 pb-3 sm:px-5 sm:pt-5 border-b border-gray-100">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="flex-shrink-0 p-2 bg-indigo-50 rounded-lg">
                      <Printer className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                        Order #{order.displayId || order.id}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(order.timestamp).toLocaleString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: 'numeric', minute: '2-digit', hour12: true
                        })}
                      </p>
                      {order.paymentId && (
                        <p className="text-[10px] text-gray-400 mt-0.5 font-mono truncate max-w-[200px]">
                          {order.paymentId}
                        </p>
                      )}
                    </div>
                  </div>
                  {/* Status Badge */}
                  <span className={`flex-shrink-0 ml-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                    {s.label}
                  </span>
                </div>

                {/* ── Progress Bar ─────────────────────────────────────── */}
                {currentStatus !== 'rejected' && currentStatus !== 'failed' && currentStatus !== 'cancelled' ? (
                  <div className="px-4 sm:px-8 py-4 sm:py-5">
                    <div className="relative">
                      <div className="absolute top-3.5 sm:top-5 left-[0.75rem] right-[0.75rem] sm:left-[1.25rem] sm:right-[1.25rem] h-0.5 sm:h-1 bg-slate-100 -translate-y-1/2 rounded">
                        <div
                          className="h-full bg-indigo-600 rounded transition-all duration-500"
                          style={{
                            width: (currentStatus === 'completed') ? '100%' :
                              (currentStatus === 'processing' || currentStatus === 'ready') ? '50%' : '0%'
                          }}
                        />
                      </div>
                      <div className="relative flex justify-between">
                        {[
                          { step: 1, label: 'PLACED',    active: ['pending','processing','ready','completed'] },
                          { step: 2, label: 'READY',     active: ['processing','ready','completed'] },
                          { step: 3, label: 'DONE',      active: ['completed'] },
                        ].map(({ step, label, active }) => (
                          <div key={step} className="flex flex-col items-center flex-1">
                            <div className={`w-6 h-6 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-[10px] sm:text-sm font-bold z-10 transition-colors duration-300 ${active.includes(currentStatus) ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>
                              {step}
                            </div>
                            <span className={`mt-1.5 text-[8px] sm:text-xs font-bold tracking-widest uppercase ${active.includes(currentStatus) ? 'text-indigo-600' : 'text-slate-400'}`}>
                              {label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mx-4 sm:mx-5 my-4 p-3 bg-red-50 rounded-lg text-center">
                    <span className="text-red-700 font-medium text-sm flex justify-center items-center gap-1">
                      <X className="h-4 w-4" />
                      {order.status === 'failed' ? 'Payment Failed' : 'Order Cancelled'}
                    </span>
                  </div>
                )}

                {/* ── File Items ───────────────────────────────────────── */}
                <div className="px-4 sm:px-5 pb-3 space-y-2">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center space-x-2 sm:space-x-3 bg-gray-50 rounded-lg px-3 py-2">
                      <FileText className="h-4 w-4 flex-shrink-0 text-indigo-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{item.fileName}</p>
                        <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">
                          {item.copies} {item.copies === 1 ? 'copy' : 'copies'} · {item.isColor ? 'Color' : 'B&W'} · {item.pages} {item.pages === 1 ? 'page' : 'pages'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── Footer: Time + Amount + Invoice ─────────────────── */}
                <div className="flex items-center justify-between px-4 sm:px-5 py-3 bg-gray-50 border-t border-gray-100">
                  <div className="flex items-center space-x-1.5 text-xs text-gray-500">
                    <Clock className="h-3.5 w-3.5" />
                    <span>
                      {order.status === 'completed'
                        ? order.completedAt
                          ? `Completed ${new Date(order.completedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })}`
                          : 'Completed'
                        : order.status === 'rejected'
                          ? 'Cancelled'
                          : order.status === 'failed'
                            ? 'Payment Failed'
                            : 'Expected in 15–20 mins'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {order.invoiceUrl && (
                      <a
                        href={order.invoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View Invoice
                      </a>
                    )}
                    <p className="font-bold text-gray-900 text-sm">₹{order.total.toFixed(2)}</p>
                  </div>
                </div>

                {/* ── OTP Section ──────────────────────────────────────── */}
                {order.status === 'processing' && order.isPaid && order.otp && (
                  <div className="px-4 sm:px-5 pb-4 pt-1">
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Shield className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-semibold text-blue-900">Your Verification Code</span>
                      </div>
                      <div className="flex justify-center gap-2 mb-2">
                        {(order.otp || '').split('').map((digit, index) => (
                          <div
                            key={index}
                            className="w-11 h-11 border-2 border-blue-200 bg-white rounded-xl flex items-center justify-center shadow-sm"
                          >
                            <span className="text-xl font-black text-blue-700">{digit}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-blue-600 text-center">Show this code to the seller when collecting your prints</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between sm:px-6">
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, filteredOrders.length)}</span> of <span className="font-medium">{filteredOrders.length}</span> results
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