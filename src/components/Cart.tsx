import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, Printer, MapPin, Clock, FileText, Image as ImageIcon, Shield, CheckCircle, Copy } from 'lucide-react';
import { PrintJob, PrintShop } from '../types';
import CashfreeCheckout from './CashfreeCheckout';
import { toast } from 'react-hot-toast';

interface CartProps {
  items: PrintJob[];
  onRemove: (id: string) => void;
  basePrice: number;
  isOpen: boolean;
  onClose: () => void;
  selectedShop: PrintShop | null;
  onShopSelect: (shopId: string) => void;
  shops: PrintShop[];
}

const Cart: React.FC<CartProps> = ({
  items,
  onRemove,
  basePrice,
  isOpen,
  onClose,
  selectedShop,
  onShopSelect,
  shops,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showFilePreviewModal, setShowFilePreviewModal] = useState(false);
  const [fileToPreview, setFileToPreview] = useState<File | null>(null);
  const [showOTPDisplay, setShowOTPDisplay] = useState(false);
  const [generatedOTP, setGeneratedOTP] = useState<string>('');
  const [orderId, setOrderId] = useState<string>('');

  if (!isOpen) return null;

  const totalPages = items.reduce((sum, job) => sum + job.copies, 0);
  const totalAmount = totalPages * basePrice;

  const handleCheckout = () => {
    setIsProcessing(true);
  };

  const generateOTP = () => {
    // Generate a 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const orderId = `ORD-${Date.now()}`;
    
    // Store OTP in localStorage for seller to access
    localStorage.setItem(`otp_${orderId}`, otp);
    localStorage.setItem(`otp_${orderId}_timestamp`, Date.now().toString());
    localStorage.setItem(`otp_${orderId}_customer_phone`, '+91 98765 43210'); // In real app, get from user profile
    localStorage.setItem(`otp_${orderId}_seller_phone`, '+91 87654 32109'); // In real app, get from shop details
    
    return { otp, orderId };
  };

  const handlePaymentSuccess = (response: any) => {
    console.log('Payment successful:', response);
    
    // Generate OTP and order ID
    const { otp, orderId: newOrderId } = generateOTP();
    
    // Store order details
    setGeneratedOTP(otp);
    setOrderId(newOrderId);
    
    // Show OTP display
    setIsProcessing(false);
    setShowOTPDisplay(true);
    
    // In a real app, you would:
    // 1. Send OTP via SMS to both customer and seller
    // 2. Update the order status in your database
    // 3. Notify the seller about the new order
    
    console.log(`OTP ${otp} generated for order ${newOrderId}`);
    console.log(`OTP sent to customer: +91 98765 43210`);
    console.log(`OTP sent to seller: +91 87654 32109`);
    
    toast.success('Payment successful! OTP generated for order verification.');
  };

  const handlePaymentError = (error: any) => {
    console.error('Payment failed:', error);
    setIsProcessing(false);
    // Show error message to user
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-0 sm:p-6">
      <div className="bg-white rounded-lg shadow-xl max-w-full md:max-w-2xl w-full max-h-[calc(100vh-32px)] sm:max-h-[90vh] flex flex-col overflow-hidden">
        <div className="sticky top-0 bg-white z-10 px-4 py-3 border-b flex-shrink-0">
          <div className="flex justify-between items-center">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Your Cart</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
              aria-label="Close cart"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0 flex-grow">
          {items.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Your cart is empty</p>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 sm:p-4 bg-gray-50 rounded-lg cursor-pointer"
                    onClick={() => {
                      setFileToPreview(item.file);
                      setShowFilePreviewModal(true);
                    }}
                  >
                    <div className="flex items-center space-x-4">
                      {item.file.type.startsWith('image/') ? (
                        <ImagePreview file={item.file} />
                      ) : item.file.type === 'application/pdf' ? (
                        <FileText className="h-6 w-6 text-red-600" />
                      ) : (
                        <FileText className="h-6 w-6 text-gray-600" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">
                          {item.file.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {item.copies} {item.copies === 1 ? 'copy' : 'copies'} •{' '}
                          {item.isColor ? 'Color' : 'B&W'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(item.id);
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Select Print Shop
                </h3>
                <div className="space-y-4">
                  {shops.map((shop) => (
                    <div
                      key={shop.id}
                      className={`p-2 sm:p-4 border rounded-lg cursor-pointer ${
                        selectedShop?.id === shop.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200'
                      }`}
                      onClick={() => onShopSelect(shop.id.toString())}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {shop.name}
                          </h4>
                          <div className="flex items-center space-x-2 sm:space-x-4 mt-1">
                            <div className="flex items-center text-sm text-gray-500">
                              <MapPin className="h-4 w-4 mr-1" />
                              {shop.distance} km
                            </div>
                            <div className="flex items-center text-sm text-gray-500">
                              <Clock className="h-4 w-4 mr-1" />
                              {shop.eta} min
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">
                            ₹{shop.price.toFixed(2)}
                          </p>
                          <p className="text-sm text-gray-500">per page</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="sticky bottom-0 bg-white border-t border-gray-200 pt-4 pb-4 px-3 sm:px-6 flex-shrink-0">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-600">Total Pages:</span>
                  <span className="font-medium text-gray-900">{totalPages}</span>
                </div>
                <div className="flex justify-between items-center mb-6">
                  <span className="text-gray-600">Total Amount:</span>
                  <span className="text-lg font-bold text-gray-900">
                    ₹{totalAmount.toFixed(2)}
                  </span>
                </div>

                {selectedShop ? (
                  <button
                    onClick={handleCheckout}
                    disabled={isProcessing}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {isProcessing ? 'Processing...' : 'Proceed to Checkout'}
                  </button>
                ) : (
                  <p className="text-center text-red-600">
                    Please select a print shop to continue
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {isProcessing && selectedShop && (
          <CashfreeCheckout
            amount={totalAmount}
            currency="INR"
            receipt={`order_${Date.now()}`}
            printJobs={JSON.stringify(items)}
            shopId={selectedShop.id.toString()}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
          />
        )}

        {showFilePreviewModal && fileToPreview && (
          <FilePreviewModal
            file={fileToPreview}
            onClose={() => setShowFilePreviewModal(false)}
          />
        )}

        {/* OTP Display Modal */}
        {showOTPDisplay && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-full">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Payment Successful!</h3>
                    <p className="text-sm text-gray-500">Your order is confirmed</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowOTPDisplay(false);
                    onClose();
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Close"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Order Info */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="text-center">
                  <p className="font-medium text-gray-900">Order #{orderId}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Total Amount: ₹{totalAmount.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500">
                    Shop: {selectedShop?.name}
                  </p>
                </div>
              </div>

              {/* OTP Display */}
              <div className="text-center mb-6">
                <div className="flex items-center justify-center space-x-2 mb-3">
                  <Shield className="h-5 w-5 text-blue-600" />
                  <h4 className="font-semibold text-gray-900">Your Verification Code</h4>
                </div>
                
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex justify-center space-x-2 mb-3">
                    {generatedOTP.split('').map((digit, index) => (
                      <div
                        key={index}
                        className="w-12 h-12 border-2 border-blue-300 bg-white rounded-lg flex items-center justify-center"
                      >
                        <span className="text-2xl font-bold text-blue-600">
                          {digit}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-blue-700">
                    Show this code to the seller for verification
                  </p>
                </div>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedOTP);
                    toast.success('OTP copied to clipboard!');
                  }}
                  className="flex items-center justify-center space-x-2 mx-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Copy className="h-4 w-4" />
                  <span>Copy OTP</span>
                </button>
              </div>

              {/* Instructions */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <h5 className="font-medium text-yellow-900 mb-2">Important Instructions:</h5>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• Both you and the seller have received the same OTP</li>
                  <li>• Show this OTP to the seller when collecting your prints</li>
                  <li>• The seller will verify this OTP to confirm your order</li>
                  <li>• Keep this OTP safe until you collect your order</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowOTPDisplay(false);
                    onClose();
                  }}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    // Navigate to order tracking or account page
                    setShowOTPDisplay(false);
                    onClose();
                    toast.success('You can track your order in the Account section');
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Track Order
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.getElementById('modal-root')!
  );
};

interface ImagePreviewProps {
  file: File;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({ file }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  if (!imageUrl) return <Printer className="h-6 w-6 text-blue-600" />;

  return (
    <img
      src={imageUrl}
      alt="File preview"
      className="h-10 w-10 object-cover rounded-md border border-gray-200"
    />
  );
};

interface FilePreviewModalProps {
  file: File;
  onClose: () => void;
}

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ file, onClose }) => {
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setFileUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  if (!fileUrl) return null; // Or a loading spinner

  const isImage = file.type.startsWith('image/');
  const isPdf = file.type === 'application/pdf';

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-full md:max-w-2xl w-full max-h-[90vh] flex flex-col mx-4">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">Preview: {file.name}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close preview"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="flex-grow overflow-hidden p-2 flex items-center justify-center">
          {isImage && (
            <img src={fileUrl} alt="File preview" className="max-w-full max-h-full object-contain" />
          )}
          {isPdf && (
            <iframe src={fileUrl} title="PDF preview" className="w-full h-full border-none" />
          )}
          {!isImage && !isPdf && (
            <p className="text-gray-500">No preview available for this file type.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Cart;