import React, { useState } from 'react';
import { Shield, CheckCircle, Clock, RefreshCw, X } from 'lucide-react';
import { Order } from '../../types';
import { generateSampleOrders } from '../../utils/sampleOrders';
import OTPVerification from './OTPVerification';

const OTPDemo: React.FC = () => {
  const [orders] = useState<Order[]>(generateSampleOrders());
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const handleOTPVerification = (order: Order) => {
    setSelectedOrder(order);
    setShowOTPVerification(true);
  };

  const handleVerificationSuccess = () => {
    if (selectedOrder) {
      console.log('Order verified successfully:', selectedOrder.id);
      // In a real app, you would update the order status in the database
    }
    setShowOTPVerification(false);
    setSelectedOrder(null);
  };

  const handleVerificationFailed = () => {
    console.log('OTP verification failed');
    setShowOTPVerification(false);
    setSelectedOrder(null);
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
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">OTP Verification Demo</h1>
        <p className="text-gray-600 mb-6">
          This demo shows how the 4-digit OTP verification system works between customers and sellers, 
          similar to Uber/Rapido pickup verification.
        </p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
          <ul className="text-blue-800 text-sm space-y-1">
            <li>• When an order is ready for pickup, both customer and seller receive the same 4-digit OTP</li>
            <li>• Customer enters the OTP to verify they are picking up the correct order</li>
            <li>• OTP expires after 5 minutes for security</li>
            <li>• Maximum 3 attempts before requiring a new OTP</li>
            <li>• Once verified, the order status updates to confirmed</li>
          </ul>
        </div>
      </div>

      <div className="grid gap-6">
        {orders.map((order) => (
          <div key={order.id} className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Shield className="h-6 w-6 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">Order #{order.id}</h3>
                  <p className="text-sm text-gray-500">
                    Customer: {order.customerPhone} | Seller: {order.sellerPhone}
                  </p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </span>
            </div>

            <div className="mb-4">
              <h4 className="font-medium text-gray-900 mb-2">Order Items:</h4>
              <div className="space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{item.fileName}</span>
                    <span className="text-gray-500">
                      {item.copies} {item.copies === 1 ? 'copy' : 'copies'} • 
                      {item.isColor ? ' Color' : ' B&W'} • 
                      {item.pages} pages
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500">
                    {new Date(order.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="text-sm font-medium text-gray-900">
                  Total: ₹{order.total.toFixed(2)}
                </div>
              </div>
            </div>

            {/* OTP Verification Section */}
            {order.status === 'processing' && (
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {order.otpVerified ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="text-green-600 font-medium">OTP Verified</span>
                      </>
                    ) : (
                      <>
                        <Shield className="h-5 w-5 text-blue-600" />
                        <span className="text-gray-600">Ready for pickup</span>
                      </>
                    )}
                  </div>
                  {!order.otpVerified && (
                    <button
                      onClick={() => handleOTPVerification(order)}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Shield className="h-4 w-4" />
                      <span>Verify OTP</span>
                    </button>
                  )}
                </div>
                {!order.otpVerified && (
                  <p className="text-sm text-gray-500 mt-2">
                    Both you and the seller will receive the same OTP for verification
                  </p>
                )}
              </div>
            )}

            {order.status === 'completed' && order.otpVerified && (
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center space-x-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Order completed and verified</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* OTP Verification Modal */}
      {selectedOrder && (
        <OTPVerification
          orderId={selectedOrder.id}
          customerPhone={selectedOrder.customerPhone}
          sellerPhone={selectedOrder.sellerPhone}
          onVerificationSuccess={handleVerificationSuccess}
          onVerificationFailed={handleVerificationFailed}
          onClose={() => setShowOTPVerification(false)}
          isOpen={showOTPVerification}
        />
      )}
    </div>
  );
};

export default OTPDemo;
