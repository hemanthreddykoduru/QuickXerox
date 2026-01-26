import React from 'react';
import { CheckCircle, XCircle, Clock, AlertCircle, Download, Eye, Shield } from 'lucide-react';
import { Order, OrderStatus } from '../../types';
import { toast } from 'react-hot-toast';
import { getSignedUrl } from '../../services/storageService';
import Skeleton from '../../common/Skeleton';

interface OrderListProps {
  orders: (Order & { otp?: string })[];
  onStatusChange: (orderId: string, status: OrderStatus) => void;
  onOTPVerificationComplete?: (orderId: string) => void; // kept for compatibility, not used
  isLoading?: boolean;
}

const OrderList: React.FC<OrderListProps> = ({ orders, onStatusChange, onOTPVerificationComplete, isLoading }) => {



  const getStatusBadge = (status: OrderStatus) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return badges[status] || badges.pending;
  };

  const getStatusIcon = (status: OrderStatus) => {
    const icons = {
      pending: <Clock className="h-5 w-5 text-yellow-500" />,
      processing: <AlertCircle className="h-5 w-5 text-blue-500" />,
      completed: <CheckCircle className="h-5 w-5 text-green-500" />,
      rejected: <XCircle className="h-5 w-5 text-red-500" />,
    };
    return icons[status] || icons.pending;
  };

  const handleDownload = async (fileName: string, fileUrl?: string, filePath?: string) => {
    try {
      let downloadUrl = fileUrl;

      // Privacy: If we have a Supabase filePath, try to generate a signed URL
      if (filePath) {
        try {
          toast.loading(`Securing access for ${fileName}...`);
          downloadUrl = await getSignedUrl(filePath);
          toast.dismiss();
        } catch (signedUrlError) {
          console.error('Signed URL generation failed:', signedUrlError);
          toast.dismiss();
          // If signed URL fails, fallback to fileUrl if available
          if (fileUrl) {
            toast.success('Using direct file link');
            downloadUrl = fileUrl;
          } else {
            throw new Error('File path not accessible and no fallback URL available');
          }
        }
      }

      if (downloadUrl) {
        // use the downloadUrl (signed or public) to open/download
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.target = "_blank";
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        toast.error("File not found or access denied.");
      }
    } catch (error) {
      console.error("Download Error:", error);
      toast.dismiss();
      toast.error("Unable to access file. The file may have been deleted or moved.");
    }
  };

  const handleView = (fileName: string) => {
    // Open the file in a new tab or show the file preview
    const fileUrl = `/files/${fileName}`; // Replace with actual URL or file path
    window.open(fileUrl, '_blank');
  };

  return (
    <div className="bg-white shadow-sm rounded-lg divide-y divide-gray-200">
      {isLoading ? (
        Array(3).fill(0).map((_, i) => (
          <div key={i} className="p-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-3 w-1/2">
                <Skeleton width={20} height={20} variant="circular" />
                <div>
                  <Skeleton width={120} height={20} className="mb-1" />
                  <Skeleton width={150} height={16} />
                </div>
              </div>
              <Skeleton width={80} height={24} className="rounded-full" />
            </div>
            <div className="space-y-2 mb-4">
              <Skeleton width={150} height={20} />
              <Skeleton width="80%" height={24} />
            </div>
            <div className="flex justify-between items-center">
              <Skeleton width={100} height={24} />
              <Skeleton width={100} height={32} />
            </div>
          </div>
        ))
      ) : orders.map((order) => (
        <div key={order.id} className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
            <div className="flex items-center space-x-3">
              {getStatusIcon(order.status)}
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Order #{order.id}
                </h3>
                <p className="text-sm text-gray-500">
                  {new Date(order.timestamp).toLocaleString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                </p>
              </div>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium self-start sm:self-auto ${getStatusBadge(
                order.status
              )}`}
            >
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
          </div>

          <div className="mt-4">
            <div className="text-sm text-gray-500">
              <p className="font-medium text-gray-900">{order.customerName}</p>
              {order.items.map((item) => (
                <div key={item.id} className="mt-2 flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div className="mb-2 sm:mb-0">
                    <p className="font-medium text-gray-900">{item.fileName}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {item.copies} {item.copies === 1 ? 'copy' : 'copies'} •{' '}
                      {item.isColor ? 'Color' : 'B&W'} • {item.pages} pages
                    </p>
                  </div>
                  <div className="flex space-x-3">
                    {/* Download Button */}
                    <button
                      onClick={() => handleDownload(item.fileName, item.fileUrl, item.filePath)}
                      className="flex items-center space-x-1 text-blue-500 hover:underline"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download</span>
                    </button>
                    {/* View Button with Eye Icon */}
                    <button
                      onClick={() => handleDownload(item.fileName, item.fileUrl, item.filePath)}
                      className="flex items-center space-x-1 text-blue-500 hover:underline"
                    >
                      <Eye className="h-4 w-4" /> {/* Eye Icon */}
                      <span>View</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* OTP Display for Processing Orders (verification removed) */}
          {order.status === 'processing' && order.isPaid && (
            <div className="mt-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-3">
                  <Shield className="h-5 w-5 text-blue-600" />
                  <h4 className="font-medium text-blue-900">Customer OTP</h4>
                </div>

                <div className="flex justify-center space-x-2 mb-2">
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

                <p className="text-xs text-blue-700 text-center">
                  Customer: {order.customerPhone} • Ask customer to show this OTP
                </p>
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-900">Total:</span>
              <span className="text-lg font-bold text-gray-900">
                ₹{order.total.toFixed(2)}
              </span>
              {order.isPaid && (
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Paid
                </span>
              )}
            </div>

            {order.status === 'pending' && (
              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <button
                  onClick={() => onStatusChange(order.id, 'processing')}
                  className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Accept
                </button>
              </div>
            )}

            {order.status === 'processing' && (
              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <button
                  onClick={() => onStatusChange(order.id, 'completed')}
                  className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Mark as Complete
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default OrderList;
