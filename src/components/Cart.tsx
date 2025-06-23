import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, Printer, MapPin, Clock, FileText, Image as ImageIcon } from 'lucide-react';
import { PrintJob, PrintShop } from '../types';
import RazorpayCheckout from './RazorpayCheckout';

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

  if (!isOpen) return null;

  const totalPages = items.reduce((sum, job) => sum + job.copies, 0);
  const totalAmount = totalPages * basePrice;

  const handleCheckout = () => {
    setIsProcessing(true);
  };

  const handlePaymentSuccess = (response: any) => {
    console.log('Payment successful:', response);
    // Here you would typically:
    // 1. Update the order status in your database
    // 2. Clear the cart
    // 3. Show a success message
    // 4. Redirect to order confirmation page
    setIsProcessing(false);
    onClose();
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
          <RazorpayCheckout
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