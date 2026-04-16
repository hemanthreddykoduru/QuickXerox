import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, Printer, MapPin, Clock, FileText, Shield, CheckCircle, Copy, Trash2, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PrintJob, PrintShop } from '../../types';
import RazorpayCheckout from './RazorpayCheckout';
import { toast } from 'react-hot-toast';
import { UserProfile } from '../../types';
import { uploadFile } from '../../services/storageService';
import { auth, db } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { generateInvoice } from '../../utils/invoiceGenerator';

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

  if (!fileUrl) return null;

  const isImage = file.type.startsWith('image/');
  const isPdf = file.type === 'application/pdf';

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-full md:max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 truncate">Preview: {file.name}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-900 p-2 hover:bg-gray-100 rounded-full transition-all"
            aria-label="Close preview"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="flex-grow overflow-auto p-4 flex items-center justify-center bg-gray-50">
          {isImage && (
            <img src={fileUrl} alt="File preview" className="max-w-full max-h-full object-contain rounded-lg shadow-sm" />
          )}
          {isPdf && (
            <iframe src={fileUrl} title="PDF preview" className="w-full h-full border-none rounded-lg" />
          )}
          {!isImage && !isPdf && (
            <div className="text-center p-12">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No preview available for this file type.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

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
  const [isUploading, setIsUploading] = useState(false);
  const [showFilePreviewModal, setShowFilePreviewModal] = useState(false);
  const [fileToPreview, setFileToPreview] = useState<File | null>(null);
  const [showOTPDisplay, setShowOTPDisplay] = useState(false);
  const [generatedOTP, setGeneratedOTP] = useState<string>('');
  const [orderId, setOrderId] = useState<string>('');
  const [itemsWithUrls, setItemsWithUrls] = useState<any[]>([]);

  // Type-safe motion components workaround for React 19 types mismatch
  const MotionDiv = motion.div as any;
  const MotionButton = motion.button as any;

  const totalPages = items.reduce((sum, job) => sum + (job.pageCount * job.copies), 0);
  const totalAmount = totalPages * basePrice;

  const handleCheckout = async () => {
    if (!selectedShop) return;

    try {
      setIsUploading(true);
      const newOrderId = `ORD-${Date.now()}`;
      setOrderId(newOrderId);

      const uploadedItems = await Promise.all(
        items.map(async (item) => {
          try {
            const userId = auth.currentUser?.uid || 'guest';
            const customerName = userProfile?.name || 'Guest User';
            const filePath = await uploadFile(item.file, userId, newOrderId, customerName);

            return {
              id: item.id,
              fileName: item.file.name,
              filePath: filePath,
              fileUrl: '',
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
      setIsProcessing(true);
    } catch (error) {
      console.error("Checkout process failed during upload:", error);
      setIsUploading(false);
    }
  };

  const handlePaymentSuccess = (response: any) => {
    const otp = response.otp || '';
    setGeneratedOTP(otp);
    setIsProcessing(false);
    setShowOTPDisplay(true);

    const autoEmailInvoice = async () => {
      try {
        if (!userProfile?.email || !selectedShop) return;

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

        const pdfBlob = await generateInvoice(orderForInvoice, userProfile.email, true) as Blob;
        if (!pdfBlob) throw new Error("PDF generation failed");

        const reader = new FileReader();
        reader.readAsDataURL(pdfBlob);
        reader.onloadend = async () => {
          const base64data = reader.result?.toString().split(',')[1];
          const fileName = `Invoice_${orderId}_${Date.now()}.pdf`;

          try {
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
            const orderRef = doc(db, 'orders', orderId);
            await updateDoc(orderRef, { invoiceUrl: downloadURL });
          } catch (error: any) {
            console.error("Auto-invoice upload failed:", error);
          }
        };
      } catch (error) {
        console.error("Auto-invoice setup failed:", error);
      }
    };

    autoEmailInvoice();
  };

  const handlePaymentError = (error: any) => {
    setIsProcessing(false);
    const errorMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Failed to initiate payment';
    toast.error(`Payment Error: ${errorMessage}`);
  };

  return ReactDOM.createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4 sm:p-6">
            <MotionDiv
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />

            <MotionDiv
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
              className="relative bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl max-w-full md:max-w-2xl w-full max-h-[calc(100vh-32px)] sm:max-h-[90vh] flex flex-col overflow-hidden border border-white/20"
            >
              <div className="sticky top-0 bg-white/50 backdrop-blur-md z-10 px-6 py-4 border-b border-gray-100 flex-shrink-0">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Your Cart</h2>
                    <p className="text-sm text-gray-500 mt-0.5">{items.length} print {items.length === 1 ? 'job' : 'jobs'} ready</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-900 p-2 hover:bg-gray-100 rounded-full transition-all duration-200"
                    aria-label="Close cart"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0 flex-grow scroll-smooth">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-4">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                      <Printer className="h-10 w-10 text-gray-300" />
                    </div>
                    <p className="text-gray-500 font-medium">Your cart is empty</p>
                    <button onClick={onClose} className="mt-4 text-blue-600 font-semibold hover:underline">
                      Go pick a shop
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4 mb-8">
                      <AnimatePresence mode="popLayout">
                        {items.map((item) => (
                          <MotionDiv
                            layout
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            key={item.id}
                            className="group relative flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50/50 hover:bg-white border border-transparent hover:border-gray-200 hover:shadow-sm rounded-xl cursor-pointer transition-all duration-200 gap-3"
                            onClick={() => {
                              setFileToPreview(item.file);
                              setShowFilePreviewModal(true);
                            }}
                          >
                            <div className="flex items-start sm:items-center space-x-4 w-full sm:w-auto overflow-hidden">
                              <div className="flex-shrink-0">
                                {item.file.type.startsWith('image/') ? (
                                  <ImagePreview file={item.file} />
                                ) : (
                                  <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center border border-red-100">
                                    <FileText className="h-5 w-5 text-red-600" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                                  {item.file.name}
                                </p>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                                  <span className="text-xs font-medium text-gray-500 flex items-center">
                                    <Copy className="h-3 w-3 mr-1" />
                                    {item.copies} {item.copies === 1 ? 'copy' : 'copies'}
                                  </span>
                                  <span className="text-xs font-medium text-gray-500 flex items-center">
                                    <FileText className="h-3 w-3 mr-1" />
                                    {item.pageCount} {item.pageCount === 1 ? 'page' : 'pages'}
                                  </span>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${item.isColor ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-700'}`}>
                                    {item.isColor ? 'Color' : 'B&W'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemove(item.id);
                              }}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all self-end sm:self-center"
                              title="Remove item"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </MotionDiv>
                        ))}
                      </AnimatePresence>
                    </div>

                    <div className="border-t border-gray-100 pt-5 pb-2">
                      <div className="mb-3">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                          Select Print Shop
                        </h3>
                      </div>
                      <div className="space-y-3 px-0.5 pb-24">
                        {shops.map((shop) => (
                          <MotionDiv
                            whileHover={{ scale: 1.005 }}
                            whileTap={{ scale: 0.995 }}
                            key={shop.id}
                            className={`relative group p-3 border rounded-xl cursor-pointer transition-all duration-300 ${selectedShop?.id === shop.id
                              ? 'border-blue-500 bg-blue-50/40 shadow-sm ring-1 ring-blue-500/10'
                              : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-md'
                            }`}
                            onClick={() => onShopSelect(shop.id.toString())}
                          >
                            {selectedShop?.id === shop.id && (
                              <MotionDiv
                                layoutId="selected-glow"
                                className="absolute inset-0 rounded-xl bg-blue-400/5 blur-lg -z-10"
                              />
                            )}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className={`p-2 rounded-lg transition-colors ${selectedShop?.id === shop.id ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-400'}`}>
                                  <Printer className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                  <h4 className="font-bold text-gray-900 leading-none mb-1 text-sm sm:text-base">
                                    {shop.name}
                                  </h4>
                                  <div className="flex items-center space-x-3">
                                    <div className="flex items-center text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                                      <MapPin className="h-2.5 w-2.5 mr-1 text-blue-500" />
                                      {shop.distance} km
                                    </div>
                                    <div className="flex items-center text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                                      <Clock className="h-2.5 w-2.5 mr-1 text-blue-500" />
                                      {shop.eta} min
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right flex flex-col items-end">
                                <span className="text-lg font-black text-gray-900 tracking-tighter">
                                  ₹{shop.price.toFixed(2)}
                                </span>
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none">per page</span>
                              </div>
                            </div>
                          </MotionDiv>
                        ))}
                      </div>
                    </div>

                    <div className="sticky bottom-0 bg-white/80 backdrop-blur-lg border-t border-gray-100 pt-6 pb-6 px-6 sm:px-8 mt-auto flex-shrink-0 mx-[-24px] mb-[-24px]">
                      <div className="space-y-3 mb-6">
                        <div className="flex justify-between items-center text-sm font-medium">
                          <span className="text-gray-500">Total Pages:</span>
                          <span className="text-gray-900 bg-gray-100 px-2 py-0.5 rounded-md leading-none">{totalPages}</span>
                        </div>
                        <div className="flex justify-between items-end border-t border-gray-50 pt-3">
                          <span className="text-gray-500 font-medium">Total Amount</span>
                          <div className="text-right">
                            <span className="text-3xl font-black text-blue-600 tracking-tight">₹{totalAmount.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      {selectedShop ? (
                        <MotionButton
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleCheckout}
                          disabled={isProcessing || isUploading}
                          className="group w-full relative h-14 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-200 overflow-hidden flex justify-center items-center transition-all disabled:opacity-50"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-500 group-hover:from-blue-500 group-hover:to-blue-400 transition-all duration-300" />
                          <span className="relative flex items-center">
                            {isUploading ? (
                              <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Uploading Files...
                              </>
                            ) : isProcessing ? (
                              'Initializing Razorpay...'
                            ) : (
                              <>
                                Proceed to Checkout
                                <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                              </>
                            )}
                          </span>
                        </MotionButton>
                      ) : (
                        <MotionDiv
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="p-4 bg-red-50 rounded-xl border border-red-100 flex items-center justify-center space-x-2"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                          <p className="text-red-700 text-sm font-bold">Select a print shop to continue</p>
                        </MotionDiv>
                      )}
                    </div>
                  </>
                )}
              </div>
            </MotionDiv>
          </div>

          {isProcessing && selectedShop && (
            <RazorpayCheckout
              amount={totalAmount}
              currency="INR"
              receipt={orderId}
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

          {showOTPDisplay && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto font-sans">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 rounded-full">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Payment Successful!</h3>
                      <p className="text-sm text-gray-500">Order confirmed</p>
                    </div>
                  </div>
                  <button onClick={() => { setShowOTPDisplay(false); onClose(); }} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-6 text-center">
                  <p className="font-medium text-gray-900">Order #{orderId}</p>
                  <div className="flex justify-center space-x-4 mt-2 text-sm text-gray-500">
                    <span className="flex items-center"><Printer className="h-3 w-3 mr-1" /> {selectedShop?.name}</span>
                    <span>₹{totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                <div className="text-center mb-6">
                  <div className="flex items-center justify-center space-x-2 mb-3">
                    <Shield className="h-5 w-5 text-blue-600" />
                    <h4 className="font-semibold text-gray-900">Verification Code</h4>
                  </div>
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
                    <div className="flex justify-center space-x-2 sm:space-x-3 mb-3">
                      {generatedOTP.split('').map((digit, index) => (
                        <div key={index} className="w-10 h-10 sm:w-12 sm:h-12 border-2 border-blue-300 bg-white rounded-lg flex items-center justify-center">
                          <span className="text-xl sm:text-2xl font-bold text-blue-600">{digit}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs sm:text-sm text-blue-700">Show this code to collection point</p>
                  </div>
                  <button
                    onClick={() => { navigator.clipboard.writeText(generatedOTP); toast.success('OTP copied to clipboard!'); }}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 shadow-sm"
                  >
                    <Copy className="h-4 w-4" />
                    <span>Copy Code</span>
                  </button>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <h5 className="font-medium text-yellow-900 mb-2 text-sm">Important:</h5>
                  <ul className="text-xs sm:text-sm text-yellow-800 space-y-1 text-left list-disc pl-4">
                    <li>Show this OTP to the seller to collect prints.</li>
                    <li>Keep this OTP safe.</li>
                  </ul>
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-3">
                  <button onClick={() => { setShowOTPDisplay(false); onClose(); }} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors">Close</button>
                  <button onClick={() => { setShowOTPDisplay(false); onClose(); toast.success('Track your order in My Account'); }} className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">Track Order</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </AnimatePresence>,
    document.getElementById('modal-root')!
  );
};

export default Cart;