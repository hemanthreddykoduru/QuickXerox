import React from 'react';
import { CheckCircle, XCircle, Clock, AlertCircle, Download, Eye } from 'lucide-react'; // Import Eye icon
import { Order, OrderStatus } from '../../types';

interface OrderListProps {
  orders: Order[];
  onStatusChange: (orderId: string, status: OrderStatus) => void;
}

const OrderList: React.FC<OrderListProps> = ({ orders, onStatusChange }) => {
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

  const handleDownload = (fileName: string) => {
    // Simulate file download logic
    const fileUrl = `/files/${fileName}`; // Replace with your actual file path or API endpoint
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleView = (fileName: string) => {
    // Open the file in a new tab or show the file preview
    const fileUrl = `/files/${fileName}`; // Replace with actual URL or file path
    window.open(fileUrl, '_blank');
  };

  return (
    <div className="bg-white shadow-sm rounded-lg divide-y divide-gray-200">
      {orders.map((order) => (
        <div key={order.id} className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getStatusIcon(order.status)}
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Order #{order.id}
                </h3>
                <p className="text-sm text-gray-500">
                  {new Date(order.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(
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
                <div key={item.id} className="mt-1 flex items-center space-x-2">
                  <span>
                    {item.fileName} - {item.copies} {item.copies === 1 ? 'copy' : 'copies'} •{' '}
                    {item.isColor ? 'Color' : 'B&W'} • {item.pages} pages
                  </span>
                  <div className="flex space-x-2">
                    {/* Download Button */}
                    <button
                      onClick={() => handleDownload(item.fileName)} 
                      className="flex items-center space-x-1 text-blue-500 hover:underline"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download</span>
                    </button>
                    {/* View Button with Eye Icon */}
                    <button
                      onClick={() => handleView(item.fileName)} 
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

          <div className="mt-4 flex items-center justify-between">
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
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => onStatusChange(order.id, 'processing')}
                  className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Accept
                </button>
              </div>
            )}

            {order.status === 'processing' && (
              <button
                onClick={() => onStatusChange(order.id, 'completed')}
                className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Mark as Complete
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default OrderList;
