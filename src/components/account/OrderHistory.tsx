import React from 'react';
import { Printer, FileText, Clock, Shield, Eye, X, ChevronRight, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const MotionDiv = motion.div as any;

  const totalPages = Math.ceil(orders.length / ITEMS_PER_PAGE);
  const getPaginatedOrders = () => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return orders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  };

  const paginatedOrders = getPaginatedOrders();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 border-green-100';
      case 'processing': return 'text-blue-600 bg-blue-50 border-blue-100';
      case 'pending': return 'text-orange-600 bg-orange-50 border-orange-100';
      case 'rejected':
      case 'failed': return 'text-red-600 bg-red-50 border-red-100';
      default: return 'text-gray-600 bg-gray-50 border-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Order History</h2>
        {!isLoading && orders.length > 0 && (
          <span className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full shadow-sm">
            {orders.length} Total
          </span>
        )}
      </div>

      <div className="space-y-4">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="bg-white/70 backdrop-blur-md rounded-3xl p-6 border border-white/40 shadow-sm animate-pulse">
              <div className="flex justify-between mb-4">
                <Skeleton width={120} height={24} />
                <Skeleton width={80} height={24} />
              </div>
              <Skeleton width="100%" height={80} className="rounded-2xl mb-4" />
              <div className="flex justify-between">
                <Skeleton width={150} height={20} />
                <Skeleton width={60} height={24} />
              </div>
            </div>
          ))
        ) : orders.length === 0 ? (
          <MotionDiv
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/70 backdrop-blur-md rounded-3xl p-12 text-center border border-white/40 shadow-sm"
          >
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Printer className="h-10 w-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">No orders yet</h3>
            <p className="text-gray-500 mt-2">When you place orders, they will appear here.</p>
          </MotionDiv>
        ) : (
          <AnimatePresence mode="popLayout">
            {paginatedOrders.map((order, index) => (
              <MotionDiv
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                key={order.id}
                className="group bg-white/70 backdrop-blur-md rounded-3xl border border-white/40 shadow-lg shadow-gray-200/20 hover:shadow-xl hover:shadow-blue-500/5 transition-all overflow-hidden"
              >
                <div className="p-5 sm:p-7">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <Printer className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-0.5">Order ID</p>
                        <p className="font-black text-gray-900 text-base sm:text-lg">#{order.id.slice(-8).toUpperCase()}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                      <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-tight">
                        {new Date(order.timestamp).toLocaleString('en-US', {
                          month: 'short', day: '2-digit', year: 'numeric',
                          hour: 'numeric', minute: '2-digit', hour12: true
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Progress Tracking Bar */}
                  {order.status !== 'rejected' && order.status !== 'failed' ? (
                    <div className="bg-gray-50/50 rounded-2xl p-5 mb-6 border border-gray-100/50">
                      <div className="relative">
                        <div className="absolute top-4 left-0 right-0 h-1 bg-gray-200 -translate-y-1/2 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: order.status === 'completed' ? '100%' :
                                order.status === 'processing' ? '50%' : '5%'
                            }}
                            className="h-full bg-blue-600"
                          />
                        </div>

                        <div className="relative flex justify-between">
                          {[
                            { step: 1, label: 'PLACED', active: true },
                            { step: 2, label: 'PRINTING', active: ['processing', 'completed'].includes(order.status) },
                            { step: 3, label: 'READY', active: order.status === 'completed' }
                          ].map((s, i) => (
                            <div key={i} className="flex flex-col items-center">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 transition-all duration-500 border-2 ${s.active ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200' : 'bg-white border-gray-200 text-gray-400'}`}>
                                {s.active ? <CheckCircle2 className="h-5 w-5" /> : <span className="text-xs font-bold">{s.step}</span>}
                              </div>
                              <span className={`mt-2 text-[10px] font-black tracking-widest uppercase transition-colors ${s.active ? 'text-blue-600' : 'text-gray-400'}`}>
                                {s.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-red-50/50 rounded-2xl p-4 text-center border border-red-100 mb-6 font-bold text-red-600 text-sm flex items-center justify-center">
                      <X className="h-5 w-5 mr-2" /> {order.status === 'failed' ? 'Payment Failed' : 'Order Cancelled'}
                    </div>
                  )}

                  <div className="space-y-3 mb-6">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 group/item hover:border-blue-100 transition-colors">
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="p-2 rounded-lg bg-red-50 text-red-600">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate">{item.fileName}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                              {item.copies} copies • {item.pages} pages • {item.isColor ? 'Color' : 'B&W'}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-300 group-hover/item:text-blue-600 transition-colors" />
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-5 border-t border-gray-100">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1.5 text-gray-500">
                        <Clock className="h-4 w-4" />
                        <span className="text-xs font-bold uppercase tracking-tight">
                          {order.status === 'completed' ? 'Delivered' : 'Est. 15-20 min'}
                        </span>
                      </div>
                      {order.invoiceUrl && (
                        <a
                          href={order.invoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-1.5 text-blue-600 hover:text-blue-800 text-xs font-black uppercase tracking-widest transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                          <span>Invoice</span>
                        </a>
                      )}
                    </div>
                    <p className="text-xl font-black text-gray-900 tracking-tighter">
                      ₹{order.total.toFixed(2)}
                    </p>
                  </div>

                  {/* OTP Section */}
                  {order.status === 'processing' && order.isPaid && order.otp && (
                    <MotionDiv
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="mt-6 pt-6 border-t border-dashed border-gray-200 overflow-hidden"
                    >
                      <div className="bg-blue-600 rounded-2xl p-5 text-white shadow-lg shadow-blue-200">
                        <div className="flex items-center space-x-2 mb-4 opacity-90">
                          <Shield className="h-4 w-4" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Verification Key</span>
                        </div>
                        <div className="flex justify-center space-x-3">
                          {order.otp.split('').map((digit, i) => (
                            <div key={i} className="w-12 h-14 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/30">
                              <span className="text-2xl font-black">{digit}</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-center text-[10px] font-bold mt-4 opacity-80 uppercase tracking-tight italic">
                          Show this code to collect your prints
                        </p>
                      </div>
                    </MotionDiv>
                  )}
                </div>
              </MotionDiv>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 pt-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 bg-white rounded-xl border border-gray-200 text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-100 disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-gray-600 transition-all"
            >
              <ChevronRight className="h-5 w-5 rotate-180" />
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 bg-white rounded-xl border border-gray-200 text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-100 disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-gray-600 transition-all"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderHistory;
story;