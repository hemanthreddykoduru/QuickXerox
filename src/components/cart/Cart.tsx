import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, Eye, Printer, MapPin, Clock, FileText, Shield, CheckCircle, Copy, Trash2, ChevronRight, CreditCard, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PrintJob, PrintShop, UserProfile } from '../../types';
import RazorpayCheckout from './RazorpayCheckout';
import { toast } from 'react-hot-toast';
import { uploadFile } from '../../services/storageService';
import { auth, db } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { generateInvoice } from '../../utils/invoiceGenerator';
import SimplePreviewModal from '../common/SimplePreviewModal';
import { applyCoupon, recordCouponUsage } from '../../services/paymentService';

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
  onClear?: () => void;
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
  onClear,
}) => {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showFilePreviewModal, setShowFilePreviewModal] = useState(false);
  const [fileToPreview, setFileToPreview] = useState<File | null>(null);
  const [showOTPDisplay, setShowOTPDisplay] = useState(false);
  const [generatedOTP, setGeneratedOTP] = useState<string>('');
  const [orderId, setOrderId] = useState<string>('');
  const [itemsWithUrls, setItemsWithUrls] = useState<any[]>([]);
  const [finalAmount, setFinalAmount] = useState<number>(0);

  // Coupon state
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ id: string; code: string; discount: number } | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  // Management of body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Type-safe motion components workaround for React 19 types mismatch
  const MotionDiv = motion.div as any;
  const MotionButton = motion.button as any;

  const totalPages = items.reduce((sum, job) => sum + (job.pageCount * job.copies), 0);
  const totalAmount = totalPages * basePrice;
  const finalTotalAmount = appliedCoupon ? Math.max(0, totalAmount - appliedCoupon.discount) : totalAmount;

  const handleApplyCoupon = async () => {
    if (!couponCodeInput.trim()) return;
    setIsApplyingCoupon(true);
    try {
      const res = await applyCoupon(couponCodeInput.trim(), totalAmount, auth.currentUser?.uid);
      setAppliedCoupon({ id: res.couponId, code: res.code, discount: res.discount });
      toast.success(`Coupon applied! You saved ₹${res.discount}`);
      setCouponCodeInput('');
    } catch (error: any) {
      toast.error(error.message || 'Invalid coupon');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    toast.success('Coupon removed');
  };

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
              pages: item.pageCount
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
    setFinalAmount(finalTotalAmount); // Save total before emptying
    setIsProcessing(false);
    setShowOTPDisplay(true);

    if (onClear) {
      onClear();
    }

    const processPostPayment = async () => {
      // Use the actual Razorpay Order ID for database updates as it is the document ID
      const dbOrderId = response.razorpay_order_id || orderId;

      // Record coupon usage if applied
      if (appliedCoupon) {
        try {
          await recordCouponUsage(appliedCoupon.id, orderId, appliedCoupon.discount, auth.currentUser?.uid);
          await updateDoc(doc(db, 'orders', dbOrderId), {
            couponCode: appliedCoupon.code,
            discountAmount: appliedCoupon.discount,
            originalTotal: totalAmount
          });
        } catch (err) {
          console.error("Failed to record coupon usage", err);
        }
      }

      // Auto-email invoice
      try {
        if (!userProfile?.email || !selectedShop) return;

        const orderForInvoice: any = {
          id: orderId, // Display ID for the PDF
          customerName: userProfile.name,
          customerPhone: userProfile.mobile,
          sellerPhone: "N/A",
          items: items.map(item => ({
            id: item.id,
            fileName: item.file.name,
            copies: item.copies,
            isColor: item.isColor,
            pages: item.pageCount // Use actual page count
          })),
          total: finalTotalAmount,
          originalTotal: totalAmount,
          discountAmount: appliedCoupon?.discount || 0,
          couponCode: appliedCoupon?.code || '',
          status: 'pending',
          timestamp: new Date().toISOString(),
          shopId: parseInt(selectedShop.id),
          isPaid: true,
          paymentId: response.razorpay_payment_id || 'N/A'
        };

        console.log("Generating invoice for order:", orderId);
        const pdfBlob = await generateInvoice(orderForInvoice, userProfile.email, true) as Blob;
        if (!pdfBlob) throw new Error("PDF generation failed");
        console.log("PDF generated successfully, size:", pdfBlob.size);

        const reader = new FileReader();
        reader.readAsDataURL(pdfBlob);
        reader.onloadend = async () => {
          console.log("FileReader onloadend triggered");
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
            const orderRef = doc(db, 'orders', dbOrderId);
            await updateDoc(orderRef, { invoiceUrl: downloadURL });
            console.log("Invoice URL updated in Firestore:", downloadURL);
            toast.success("Invoice generated successfully!");
          } catch (error: any) {
            console.error("Auto-invoice upload failed:", error);
            toast.error("Failed to upload invoice");
          }
        };
        reader.onerror = (err) => {
          console.error("FileReader error:", err);
          toast.error("Failed to read invoice data");
        };
      } catch (error) {
        console.error("Auto-invoice setup failed:", error);
        toast.error("Invoice generation failed");
      }
    };

    processPostPayment();
  };

  const handlePaymentError = (error: any) => {
    setIsProcessing(false);
    const errorMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Failed to initiate payment';
    
    // Don't show toast if it's just a user cancellation
    if (errorMessage !== 'Payment cancelled by user') {
      toast.error(`Payment Error: ${errorMessage}`);
    }
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
              className={`relative bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl max-w-full md:max-w-2xl w-full max-h-[calc(100vh-20px)] sm:max-h-[90vh] flex flex-col overflow-hidden border border-white/20 transition-opacity duration-300 ${showOTPDisplay ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
            >
              <div className="sticky top-0 bg-white/50 backdrop-blur-md z-10 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 flex-shrink-0">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Your Cart</h2>
                    <p className="text-[10px] sm:text-sm text-gray-500 mt-0.5">{items.length} print {items.length === 1 ? 'job' : 'jobs'} ready</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-900 p-1.5 sm:p-2 hover:bg-gray-100 rounded-full transition-all duration-200"
                    aria-label="Close cart"
                  >
                    <X className="h-5 w-5 sm:h-6 sm:w-6" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 sm:p-6 min-h-0 flex-grow scroll-smooth">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-4 text-center">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                      <Printer className="h-8 w-8 sm:h-10 sm:w-10 text-gray-300" />
                    </div>
                    <p className="text-sm sm:text-base text-gray-500 font-medium">Your cart is empty</p>
                    <button onClick={onClose} className="mt-3 sm:mt-4 text-blue-600 font-semibold hover:underline text-sm">
                      Go pick a shop
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                      <AnimatePresence mode="popLayout">
                        {items.map((item) => (
                          <MotionDiv
                            layout
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            key={item.id}
                            className="group relative flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-gray-50/50 hover:bg-white border border-transparent hover:border-gray-200 hover:shadow-sm rounded-xl cursor-pointer transition-all duration-200 gap-2 sm:gap-3"
                            onClick={() => {
                              setFileToPreview(item.file);
                              setShowFilePreviewModal(true);
                            }}
                          >
                            <div className="flex items-start sm:items-center space-x-3 sm:space-x-4 w-full sm:w-auto overflow-hidden">
                              <div className="flex-shrink-0">
                                {item.file.type.startsWith('image/') ? (
                                  <ImagePreview file={item.file} />
                                ) : (
                                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-50 rounded-lg flex items-center justify-center border border-red-100">
                                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm sm:text-base font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                                  {item.file.name}
                                </p>
                                <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-1 mt-0.5">
                                  <span className="text-[10px] sm:text-xs font-medium text-gray-500 flex items-center">
                                    <Copy className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                                    {item.copies} {item.copies === 1 ? 'copy' : 'copies'}
                                  </span>
                                  <span className="text-[10px] sm:text-xs font-medium text-gray-500 flex items-center">
                                    <FileText className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                                    {item.pageCount} {item.pageCount === 1 ? 'page' : 'pages'}
                                  </span>
                                  <span className={`text-[8px] sm:text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${item.isColor ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-700'}`}>
                                    {item.isColor ? 'Color' : 'B&W'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-1 self-end sm:self-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFileToPreview(item.file);
                                  setShowFilePreviewModal(true);
                                }}
                                className="p-1.5 sm:p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                title="Preview file"
                              >
                                <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRemove(item.id);
                                }}
                                className="p-1.5 sm:p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title="Remove item"
                              >
                                <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                              </button>
                            </div>
                          </MotionDiv>
                        ))}
                      </AnimatePresence>
                    </div>

                    <div className="border-t border-gray-100 pt-4 sm:pt-5 pb-2">
                      <div className="mb-2 sm:mb-3">
                        <h3 className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest">
                          Select Print Shop
                        </h3>
                      </div>
                      <div className="space-y-2 sm:space-y-3 px-0.5 pb-20 sm:pb-24">
                        {shops.map((shop) => (
                          <MotionDiv
                            whileHover={{ scale: 1.005 }}
                            whileTap={{ scale: 0.995 }}
                            key={shop.id}
                            className={`relative group p-2.5 sm:p-3 border rounded-xl cursor-pointer transition-all duration-300 ${selectedShop?.id === shop.id
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
                              <div className="flex items-center space-x-2 sm:space-x-3">
                                <div className={`p-1.5 sm:p-2 rounded-lg transition-colors ${selectedShop?.id === shop.id ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-400'}`}>
                                  <Printer className="h-4 w-4 sm:h-5 sm:w-5" />
                                </div>
                                <div className="min-w-0">
                                  <h4 className="font-bold text-gray-900 leading-none mb-1 text-xs sm:text-base">
                                    {shop.name}
                                  </h4>
                                  <div className="flex items-center space-x-2 sm:space-x-3">
                                    <div className="flex items-center text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                                      <MapPin className="h-2 w-2 sm:h-2.5 sm:w-2.5 mr-0.5 sm:mr-1 text-blue-500" />
                                      {shop.distance} km
                                    </div>
                                    <div className="flex items-center text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                                      <Clock className="h-2 w-2 sm:h-2.5 sm:w-2.5 mr-0.5 sm:mr-1 text-blue-500" />
                                      {shop.eta} min
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right flex flex-col items-end">
                                <span className="text-sm sm:text-lg font-black text-gray-900 tracking-tighter leading-none">
                                  ₹{shop.price.toFixed(2)}
                                </span>
                                <span className="text-[7px] sm:text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-0.5">per pg</span>
                              </div>
                            </div>
                          </MotionDiv>
                        ))}
                      </div>
                    </div>

                    <div className="sticky bottom-0 bg-white/80 backdrop-blur-lg border-t border-gray-100 pt-4 sm:pt-6 pb-4 sm:pb-6 px-4 sm:px-8 mt-auto flex-shrink-0 mx-[-12px] sm:mx-[-24px] mb-[-12px] sm:mb-[-24px]">
                      <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                        <div className="flex justify-between items-center text-xs sm:text-sm font-medium">
                          <span className="text-gray-500">Total Pages:</span>
                          <span className="text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded leading-none text-[10px] sm:text-xs">{totalPages}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs sm:text-sm font-medium">
                          <span className="text-gray-500">Subtotal:</span>
                          <span className="text-gray-900 font-semibold">₹{totalAmount.toFixed(2)}</span>
                        </div>
                        
                        {/* Coupon Section */}
                        {appliedCoupon ? (
                          <div className="flex justify-between items-center bg-green-50 p-1.5 sm:p-2 rounded-lg border border-green-100">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <Tag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600" />
                              <span className="text-xs sm:text-sm font-bold text-green-700">{appliedCoupon.code}</span>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3">
                              <span className="text-xs sm:text-sm font-bold text-green-700">-₹{appliedCoupon.discount.toFixed(2)}</span>
                              <button onClick={handleRemoveCoupon} className="text-gray-400 hover:text-red-500">
                                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Tag className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
                              <input 
                                type="text"
                                placeholder="Coupon Code"
                                value={couponCodeInput}
                                onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                                className="w-full pl-8 sm:pl-9 pr-3 py-1.5 sm:py-2 text-[10px] sm:text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 uppercase outline-none"
                              />
                            </div>
                            <button 
                              onClick={handleApplyCoupon}
                              disabled={isApplyingCoupon || !couponCodeInput.trim()}
                              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-900 text-white text-[10px] sm:text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                            >
                              {isApplyingCoupon ? '...' : 'Apply'}
                            </button>
                          </div>
                        )}

                        <div className="flex justify-between items-end border-t border-gray-50 pt-2 sm:pt-3 mt-2 sm:mt-3">
                          <span className="text-gray-500 font-medium text-xs sm:text-sm">Total Amount</span>
                          <div className="text-right">
                            <span className="text-2xl sm:text-3xl font-black text-blue-600 tracking-tight leading-none">₹{finalTotalAmount.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      {selectedShop ? (
                        <MotionButton
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={handleCheckout}
                          disabled={isProcessing || isUploading}
                          className="group w-full relative h-12 sm:h-14 bg-blue-600 text-white rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg shadow-lg shadow-blue-200 overflow-hidden flex justify-center items-center transition-all disabled:opacity-50"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-500 group-hover:from-blue-500 group-hover:to-blue-400 transition-all duration-300" />
                          <span className="relative flex items-center">
                            {isUploading ? (
                              <>
                                <svg className="animate-spin -ml-1 mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Uploading...
                              </>
                            ) : isProcessing ? (
                              'Starting Payment...'
                            ) : (
                              <>
                                Proceed to Checkout
                                <ChevronRight className="ml-1 sm:ml-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform" />
                              </>
                            )}
                          </span>
                        </MotionButton>
                      ) : (
                        <MotionDiv
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="p-3 sm:p-4 bg-red-50 rounded-xl border border-red-100 flex items-center justify-center space-x-2"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                          <p className="text-red-700 text-[10px] sm:text-sm font-bold">Select a shop to continue</p>
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
              amount={finalTotalAmount}
              couponCode={appliedCoupon?.code}
              currency="INR"
              receipt={orderId}
              printJobs={JSON.stringify(itemsWithUrls.length > 0 ? itemsWithUrls : items.map(item => ({
                id: item.id,
                fileName: item.file.name,
                copies: item.copies,
                isColor: item.isColor,
                pages: item.pageCount
              })))}
              shopId={selectedShop.id.toString()}
              generatedOrderId={orderId}
              userProfile={userProfile || undefined}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
            />
          )}

          {showFilePreviewModal && fileToPreview && (
            <SimplePreviewModal
              file={fileToPreview}
              onClose={() => setShowFilePreviewModal(false)}
            />
          )}

          {showOTPDisplay && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
              <MotionDiv 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl relative max-h-[90vh] overflow-y-auto font-sans border border-slate-100"
              >
                <div className="flex flex-col items-center text-center mb-6">
                  <MotionDiv
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="p-3 bg-emerald-50 rounded-full mb-3"
                  >
                    <CheckCircle className="h-8 w-8 text-emerald-600" />
                  </MotionDiv>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">Payment Successful</h3>
                  <p className="text-slate-500 text-sm mt-1">Order confirmed and ready</p>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-100">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Order ID</span>
                    <span className="text-sm font-mono font-medium text-slate-900">#{orderId}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-slate-600">
                      <Printer className="h-4 w-4 mr-2 text-slate-400" />
                      {selectedShop?.name}
                    </div>
                    <div className="flex items-center text-sm font-bold text-indigo-600">
                      <CreditCard className="h-4 w-4 mr-2 text-indigo-500" />
                      Total: ₹{finalAmount.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="text-center mb-6">
                  <div className="flex items-center justify-center space-x-2 mb-4">
                    <Shield className="h-4 w-4 text-slate-400" />
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Verification Code</h4>
                  </div>
                  
                  <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 shadow-sm">
                    <div className="flex justify-center space-x-3">
                      {generatedOTP.split('').map((digit, index) => (
                        <MotionDiv 
                          key={index}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.05 }}
                          className="w-12 h-14 bg-white border border-slate-200 rounded-lg flex items-center justify-center shadow-sm"
                        >
                          <span className="text-2xl font-bold text-slate-900">{digit}</span>
                        </MotionDiv>
                      ))}
                    </div>
                  </div>

                  <MotionButton
                    whileHover={{ backgroundColor: '#f8fafc' }}
                    onClick={() => { navigator.clipboard.writeText(generatedOTP); toast.success('Copied!'); }}
                    className="mt-4 inline-flex items-center space-x-2 px-4 py-2 text-indigo-600 hover:text-indigo-700 transition-all text-xs font-bold"
                  >
                    <Copy className="h-4 w-4" />
                    <span>Copy Code</span>
                  </MotionButton>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-xl border-l-4 border-indigo-400">
                    <p className="text-xs font-medium text-slate-600 leading-relaxed">
                      Show this code to the shopkeeper to collect your prints.
                    </p>
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row gap-3">
                    <button 
                      onClick={() => { setShowOTPDisplay(false); onClose(); }} 
                      className="flex-1 px-6 py-3 bg-white text-slate-500 font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-all text-sm"
                    >
                      Close
                    </button>
                    <MotionButton 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => { 
                        setShowOTPDisplay(false); 
                        onClose(); 
                        navigate('/account');
                      }} 
                      className="flex-1 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-all text-sm flex items-center justify-center"
                    >
                      Track Order
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </MotionButton>
                  </div>
                </div>
              </MotionDiv>
            </div>
          )}
        </>
      )}
    </AnimatePresence>,
    document.getElementById('modal-root')!
  );
};

export default Cart;