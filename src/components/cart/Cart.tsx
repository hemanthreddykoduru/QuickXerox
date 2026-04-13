import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, Printer, MapPin, Clock, FileText, Shield, CheckCircle, Copy } from 'lucide-react';
import { PrintJob, PrintShop } from '../../types';
import RazorpayCheckout from './RazorpayCheckout';
import { toast } from 'react-hot-toast';
import { UserProfile } from '../../types';
import { uploadFile } from '../../services/storageService';
import { auth, db } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { generateInvoice } from '../../utils/invoiceGenerator';


interface CartProps {
  items: PrintJob[];
  onRemove: (id: string) => void;
  basePrice: number;
  isOpen: boolean;
  onClose: () => void;
  selectedShop: PrintShop | null;
  onShopSelect: (id: string) => void;
  shops: PrintShop[];
  userProfile: UserProfile | null;
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
  userProfile,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false); // New state for upload status
  const [showFilePreviewModal, setShowFilePreviewModal] = useState(false);
  const [fileToPreview, setFileToPreview] = useState<File | null>(null);
  const [showOTPDisplay, setShowOTPDisplay] = useState(false);
  const [generatedOTP, setGeneratedOTP] = useState<string>('');
  const [orderId, setOrderId] = useState<string>('');
  const [itemsWithUrls, setItemsWithUrls] = useState<any[]>([]); // To store items with uploaded URLs

  if (!isOpen) return null;

  const totalPages = items.reduce((sum, job) => sum + (job.pageCount * job.copies), 0);
  const totalAmount = totalPages * basePrice;

  const handleCheckout = async () => {
    if (!selectedShop) return;

    try {
      setIsUploading(true);
      const newOrderId = `ORD-${Date.now()}`;
      setOrderId(newOrderId);

      // Upload files to Firebase Storage
      const uploadedItems = await Promise.all(
        items.map(async (item) => {
          try {
            const userId = auth.currentUser?.uid || 'guest';
            // Use the orderId generated at the start of checkout
            const customerName = userProfile?.name || 'Guest User';
            const filePath = await uploadFile(item.file, userId, newOrderId, customerName);

            return {
              id: item.id,
              fileName: item.file.name,
              filePath: filePath, // Save the private storage path
              fileUrl: '', // Deprecated, keep empty or remove
              copies: item.copies,
              isColor: item.isColor,
              pages: 1
            };
          } catch (error: any) {
            console.error(`Failed to upload file ${item.file.name}:`, error);
            toast.error(error.message || `Failed to upload ${item.file.name}`);
            throw error;
          }
        })
      );

      setItemsWithUrls(uploadedItems);
      setIsUploading(false);
      setIsProcessing(true); // Now trigger Razorpay
    } catch (error) {
      console.error("Checkout process failed during upload:", error);
      setIsUploading(false);
      // isProcessing remains false, so Razorpay won't open
    }
  };



  const handlePaymentSuccess = (response: any) => {
    console.log('Payment successful:', response);

    // Use OTP from RazorpayCheckout callback
    const otp = response.otp || '';

    // Keep the generated Order ID (ORD-...) as set by the state
    // if (response.orderId) { setOrderId(response.orderId); } 

    setGeneratedOTP(otp);

    // Show OTP display
    setIsProcessing(false);
    setShowOTPDisplay(true);

    // In a real app, you would:
    // 1. Send OTP via SMS to both customer and seller
    // 2. Update the order status in your database
    // 3. Notify the seller about the new order

    console.log(`OTP ${otp} generated for order ${orderId}`);
    console.log(`OTP sent to customer: +91 98765 43210`);
    console.log(`OTP sent to seller: +91 87654 32109`);

    // --- AUTOMATIC INVOICE EMAIL ---
    const autoEmailInvoice = async () => {
      try {
        if (!userProfile?.email || !selectedShop) return;

        // Construct a temporary order object for the invoice
        const orderForInvoice: any = {
          id: orderId,
          customerName: userProfile.name,
          customerPhone: userProfile.mobile,
          sellerPhone: "N/A",
          items: items.map(item => ({
            id: item.id,
            fileName: item.file.name,
            copies: item.copies,
            isColor: item.isColor,
            pages: 1
          })),
          total: totalAmount,
          status: 'completed',
          timestamp: new Date().toISOString(),
          shopId: parseInt(selectedShop.id),
          isPaid: true,
          paymentId: response.razorpay_payment_id || 'N/A'
        };

        // 1. Generate PDF Blob
        const pdfBlob = await generateInvoice(orderForInvoice, userProfile.email, true) as Blob;

        if (!pdfBlob) throw new Error("PDF generation failed");

        // 2. Convert Blob to Base64
        const reader = new FileReader();
        reader.readAsDataURL(pdfBlob);
        reader.onloadend = async () => {
          const base64data = reader.result?.toString().split(',')[1];
          const fileName = `Invoice_${orderId}_${Date.now()}.pdf`;

          try {
            // 3. Upload via Proxy API (Bypassing RLS)
            const uploadResponse = await fetch('https://quickxerox-api.vercel.app/api/upload-invoice', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fileName: fileName,
                fileBase64: base64data,
                mimeType: 'application/pdf'
              }),
            });

            const uploadResult = await uploadResponse.json();
            if (!uploadResponse.ok || !uploadResult.success) {
              throw new Error(uploadResult.error || "Failed to upload invoice");
            }

            const downloadURL = uploadResult.url;

            // 4. Save Invoice URL to Order (Do not email yet)
            const orderRef = doc(db, 'orders', orderId);
            await updateDoc(orderRef, {
              invoiceUrl: downloadURL
            });

            console.log("Invoice generated and linked:", downloadURL);

          } catch (error: any) {
            console.error("Auto-invoice upload/send failed:", error);
            toast.error("Failed to process invoice email", { id: 'auto-invoice' });
          }
        };
      } catch (error) {
        console.error("Auto-invoice setup failed:", error);
        toast.error("Failed to initiate invoice email", { id: 'auto-invoice' });
      }
    };

    // Trigger automation without blocking UI
    autoEmailInvoice();
  };

  const handlePaymentError = (error: any) => {
    console.error('Payment failed:', error);
    setIsProcessing(false);
    const errorMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Failed to initiate payment';
    toast.error(`Payment Error: ${errorMessage}`);
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4 sm:p-6">
      <div className="bg-white rounded-lg shadow-xl max-w-full md:max-w-2xl w-full max-h-[calc(100vh-32px)] sm:max-h-[90vh] flex flex-col overflow-hidden">
        <div className="sticky top-0 bg-white z-10 px-4 py-3 border-b flex-shrink-0">
          <div className="flex justify-between items-center">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Your Cart</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 p-1"
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
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg cursor-pointer gap-3 sm:gap-0"
                    onClick={() => {
                      setFileToPreview(item.file);
                      setShowFilePreviewModal(true);
                    }}
                  >
                    <div className="flex items-start sm:items-center space-x-3 sm:space-x-4 w-full sm:w-auto overflow-hidden">
                      {item.file.type.startsWith('image/') ? (
                        <ImagePreview file={item.file} />
                      ) : item.file.type === 'application/pdf' ? (
                        <FileText className="h-6 w-6 text-red-600 flex-shrink-0" />
                      ) : (
                        <FileText className="h-6 w-6 text-gray-600 flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate">
                          {item.file.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {item.copies} {item.copies === 1 ? 'copy' : 'copies'} × {item.pageCount} {item.pageCount === 1 ? 'page' : 'pages'} •{' '}
                          {item.isColor ? 'Color' : 'B&W'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(item.id);
                      }}
                      className="text-red-600 hover:text-red-700 text-sm font-medium self-end sm:self-center"
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
                      className={`p-3 sm:p-4 border rounded-lg cursor-pointer ${selectedShop?.id === shop.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200'
                        }`}
                      onClick={() => onShopSelect(shop.id.toString())}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {shop.name}
                          </h4>
                          <div className="flex items-center space-x-4 mt-1">
                            <div className="flex items-center text-sm text-gray-500">
                              <MapPin className="h-3.5 w-3.5 mr-1" />
                              {shop.distance} km
                            </div>
                            <div className="flex items-center text-sm text-gray-500">
                              <Clock className="h-3.5 w-3.5 mr-1" />
                              {shop.eta} min
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-between sm:block items-center border-t sm:border-t-0 pt-2 sm:pt-0 sm:text-right">
                          <span className="sm:hidden text-sm text-gray-500">Price/Page</span>
                          <div>
                            <p className="font-medium text-gray-900 text-lg sm:text-base">
                              ₹{shop.price.toFixed(2)}
                            </p>
                            <p className="hidden sm:block text-sm text-gray-500">per page</p>
                          </div>
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
                    disabled={isProcessing || isUploading}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 flex justify-center items-center"
                  >
                    {isUploading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Uploading...
                      </>
                    ) : isProcessing ? (
                      'Processing...'
                    ) : (
                      'Proceed to Checkout'
                    )}
                  </button>
                ) : (
                  <p className="text-center text-red-600 text-sm">
                    Select a print shop to continue
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
            receipt={orderId} // Use the generated ORD-... ID as receipt
            // Use the itemsWithUrls if available (from upload), otherwise fallback to mapping items (shouldn't happen with new flow but safe)
            printJobs={JSON.stringify(itemsWithUrls.length > 0 ? itemsWithUrls : items.map(item => ({
              id: item.id,
              fileName: item.file.name,
              copies: item.copies,
              isColor: item.isColor,
              pages: 1
            })))}
            shopId={selectedShop.id.toString()}
            generatedOrderId={orderId}
            userProfile={userProfile || undefined}
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
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-full flex-shrink-0">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Payment Successful!</h3>
                    <p className="text-sm text-gray-500">Order confirmed</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowOTPDisplay(false);
                    onClose();
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                  aria-label="Close"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Order Info */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-center">
                <p className="font-medium text-gray-900">Order #{orderId}</p>
                <div className="flex justify-center space-x-4 mt-2 text-sm text-gray-500">
                  <span className="flex items-center"><Printer className="h-3 w-3 mr-1" /> {selectedShop?.name}</span>
                  <span>₹{totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* OTP Display */}
              <div className="text-center mb-6">
                <div className="flex items-center justify-center space-x-2 mb-3">
                  <Shield className="h-5 w-5 text-blue-600" />
                  <h4 className="font-semibold text-gray-900">Verification Code</h4>
                </div>

                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex justify-center space-x-2 sm:space-x-3 mb-3">
                    {generatedOTP.split('').map((digit, index) => (
                      <div
                        key={index}
                        className="w-10 h-10 sm:w-12 sm:h-12 border-2 border-blue-300 bg-white rounded-lg flex items-center justify-center"
                      >
                        <span className="text-xl sm:text-2xl font-bold text-blue-600">
                          {digit}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-blue-700">
                    Show this code to collection point
                  </p>
                </div>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedOTP);
                    toast.success('OTP copied to clipboard!');
                  }}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 shadow-sm"
                >
                  <Copy className="h-4 w-4" />
                  <span>Copy Code</span>
                </button>
              </div>

              {/* Instructions */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <h5 className="font-medium text-yellow-900 mb-2 text-sm">Important:</h5>
                <ul className="text-xs sm:text-sm text-yellow-800 space-y-1 text-left list-disc pl-4">
                  <li>Show this OTP to the seller to collect prints.</li>
                  <li>Keep this OTP safe.</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row gap-3">
                <button
                  onClick={() => {
                    setShowOTPDisplay(false);
                    onClose();
                  }}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    // Navigate to order tracking or account page
                    setShowOTPDisplay(false);
                    onClose();
                    toast.success('Track your order in My Account');
                  }}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
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