import React from 'react';
import { CheckCircle, XCircle, Clock, AlertCircle, Download, Eye, Shield, FileText, User } from 'lucide-react';
import { Order, OrderStatus } from '../../types';
import { toast } from 'react-hot-toast';
import { getSignedUrl } from '../../services/storageService';
import { fetchActiveCampaignForShop, injectAdIntoPDF } from '../../services/pdfAdService';
import Skeleton from '../common/Skeleton';

interface OrderListProps {
  orders: (Order & { otp?: string })[];
  onStatusChange: (orderId: string, status: OrderStatus) => void;
  isLoading?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string; icon: React.ReactNode }> = {
  pending:    { label: 'Pending',    bg: 'bg-yellow-50',  text: 'text-yellow-800', dot: 'bg-yellow-500', icon: <Clock className="h-3.5 w-3.5" /> },
  processing: { label: 'Ready',     bg: 'bg-blue-50',    text: 'text-blue-800',   dot: 'bg-blue-500',   icon: <AlertCircle className="h-3.5 w-3.5" /> },
  completed:  { label: 'Completed', bg: 'bg-green-50',   text: 'text-green-800',  dot: 'bg-green-500',  icon: <CheckCircle className="h-3.5 w-3.5" /> },
  rejected:   { label: 'Rejected',  bg: 'bg-red-50',     text: 'text-red-800',    dot: 'bg-red-500',    icon: <XCircle className="h-3.5 w-3.5" /> },
};

const OrderList: React.FC<OrderListProps> = ({ orders, onStatusChange, isLoading }) => {

  const handleDownload = async (fileName: string, fileUrl?: string, filePath?: string) => {
    try {
      let downloadUrl = fileUrl;
      if (filePath) {
        try {
          toast.loading(`Securing access for ${fileName}...`);
          downloadUrl = await getSignedUrl(filePath);
          toast.dismiss();
        } catch (signedUrlError: any) {
          console.error('Signed URL generation failed:', signedUrlError);
          toast.dismiss();
          throw new Error(signedUrlError.message || 'Failed to generate signed URL');
        }
      }

      if (downloadUrl) {
        // --- Dynamic PDF Ad Injection ---
        try {
          const activeCampaign = await fetchActiveCampaignForShop();
          if (activeCampaign) {
            toast.loading('Loading document for sponsor ad placement...');
            const pdfResponse = await fetch(downloadUrl);
            const originalBytes = await pdfResponse.arrayBuffer();

            toast.loading('Applying sponsor ad banners & coupon QR codes...');
            const { pdfBytes } = await injectAdIntoPDF(originalBytes, activeCampaign);

            const stampedBlob = new Blob([pdfBytes], { type: 'application/pdf' });
            downloadUrl = URL.createObjectURL(stampedBlob);
            toast.dismiss();
            toast.success(`Successfully stamped with "${activeCampaign.brandName}" ad!`);
          }
        } catch (adInjectionError) {
          console.warn('PDF Ad Engine: Ad placement bypassed due to asset loader (CORS/Network):', adInjectionError);
          toast.dismiss();
          // Fallback seamlessly to the original URL so print job never fails!
        }
        // ---------------------------------

        const link = document.createElement('a');
        link.href = downloadUrl;
        link.target = '_blank';
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        throw new Error('File URL not found');
      }
    } catch (error: any) {
      console.error('Download Error:', error);
      toast.dismiss();
      toast.error(error.message || 'Unable to access file.');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array(3).fill(0).map((_, i) => (
          <div key={i} className="border border-gray-200 rounded-xl p-4 sm:p-5 space-y-4 animate-pulse bg-white">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3 w-1/2">
                <Skeleton width={36} height={36} variant="circular" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton width="60%" height={18} />
                  <Skeleton width="40%" height={14} />
                </div>
              </div>
              <Skeleton width={80} height={26} className="rounded-full" />
            </div>
            <Skeleton width="80%" height={20} />
            <div className="flex justify-between items-center pt-2">
              <Skeleton width={80} height={18} />
              <Skeleton width={110} height={36} className="rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
        <Clock className="h-10 w-10 mx-auto mb-3 text-gray-300" />
        <p className="text-sm font-medium text-gray-400">No orders yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const s = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;

        return (
          <div key={order.id} className="border border-gray-200 rounded-xl shadow-sm bg-white overflow-hidden">

            {/* ── Card Header ──────────────────────────────────────── */}
            <div className="flex items-start justify-between px-4 pt-4 pb-3 sm:px-5 border-b border-gray-100">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="flex-shrink-0 p-2 bg-indigo-50 rounded-lg">
                  <User className="h-4 w-4 text-indigo-600" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">Order #{order.id}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {order.customerName}
                    {order.customerPhone ? ` · ${order.customerPhone}` : ''}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {new Date(order.timestamp).toLocaleString('en-IN', {
                      day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true
                    })}
                  </p>
                </div>
              </div>
              {/* Status Badge */}
              <span className={`flex-shrink-0 ml-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                {s.label}
              </span>
            </div>

            {/* ── File Items ───────────────────────────────────────── */}
            <div className="px-4 sm:px-5 py-3 space-y-2">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 gap-2">
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    <FileText className="h-4 w-4 flex-shrink-0 text-indigo-400" />
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{item.fileName}</p>
                      <p className="text-[10px] sm:text-xs text-gray-500">
                        {item.copies} {item.copies === 1 ? 'copy' : 'copies'} · {item.isColor ? 'Color' : 'B&W'} · {item.pages} {item.pages === 1 ? 'page' : 'pages'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleDownload(item.fileName, item.fileUrl, item.filePath)}
                      className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </button>
                    <button
                      onClick={() => handleDownload(item.fileName, item.fileUrl, item.filePath)}
                      className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* ── OTP Section ──────────────────────────────────────── */}
            {order.status === 'processing' && order.isPaid && (
              <div className="px-4 sm:px-5 pb-3">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-semibold text-blue-900">Customer OTP</span>
                  </div>
                  <div className="flex justify-center gap-2 mb-1.5">
                    {(order.otp || '----').split('').map((digit, index) => (
                      <div
                        key={index}
                        className="w-10 h-10 border-2 border-blue-200 bg-white rounded-xl flex items-center justify-center shadow-sm"
                      >
                        <span className="text-lg font-black text-blue-700">{digit}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-blue-600 text-center">Ask the customer to show this code before handing over prints</p>
                </div>
              </div>
            )}

            {/* ── Footer: Amount + Actions ─────────────────────────── */}
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 bg-gray-50 border-t border-gray-100 gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900">₹{order.total.toFixed(2)}</span>
                {order.isPaid && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-800">
                    Paid
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {order.status === 'pending' && (
                  <button
                    onClick={() => onStatusChange(order.id, 'processing')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    Accept
                  </button>
                )}
                {order.status === 'processing' && (
                  <button
                    onClick={() => onStatusChange(order.id, 'completed')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors shadow-sm"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    Mark Complete
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default OrderList;
