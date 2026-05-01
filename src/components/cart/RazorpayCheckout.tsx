import React, { useEffect } from 'react';
import { createPayment, verifyPayment } from '../../services/paymentService';
import { deobs } from '../../utils/security';
import { toast } from 'react-hot-toast';
import { db, auth } from '../../firebase';
import { setDoc, doc } from 'firebase/firestore';

interface RazorpayCheckoutProps {
  amount: number;
  currency: string;
  receipt: string;
  printJobs: string;
  shopId: string;
  shopName?: string;
  generatedOrderId?: string;
  couponCode?: string;
  originalAmount?: number;
  userProfile?: {
    name: string;
    mobile: string;
    email: string;
  };
  onSuccess: (response: any) => void;
  onError: (error: any) => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

const RazorpayCheckout: React.FC<RazorpayCheckoutProps> = ({
  amount,
  currency,
  receipt,
  printJobs,
  shopId,
  shopName,
  generatedOrderId,
  couponCode,
  originalAmount,
  userProfile,
  onSuccess,
  onError,
}) => {
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const generateOTP = () => {
    // Use Web Crypto API for a cryptographically secure 6-digit OTP
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    const otp = ((array[0] % 9000) + 1000).toString();
    return { otp };
  };

  const safeParsePrintJobs = (raw: string) => {
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error('printJobs must be an array');
      return parsed;
    } catch {
      console.error('Invalid printJobs payload');
      return [];
    }
  };

  useEffect(() => {
    const handlePayment = async () => {
      try {
        const res = await loadRazorpayScript();

        if (!res) {
          toast.error('Razorpay SDK failed to load. Are you online?');
          onError(new Error('Razorpay SDK failed to load'));
          return;
        }

        if (!window.Razorpay) {
          toast.error('Razorpay SDK loaded but window.Razorpay is unavailable');
          onError(new Error('window.Razorpay is undefined'));
          return;
        }

        // 1. Create Order via Backend
        const orderData = await createPayment({
          amount: originalAmount || amount,
          currency,
          couponCode,
          userId: auth.currentUser?.uid,
        });

        if (!orderData) {
          throw new Error('Failed to create order');
        }

        const options: any = {
          key: orderData.key_id, // Access key_id from backend response
          amount: orderData.amount,
          currency: orderData.currency,
          name: "QuickXerox",
          description: "Print Job Payment",
          image: "/icon-192x192.png", // Ensure this exists or use a remote URL
          handler: async function (response: any) {
            try {
              toast.loading('Verifying payment...');
              const isVerified = await verifyPayment(
                response.razorpay_payment_id,
                response.razorpay_order_id,
                response.razorpay_signature
              );

              if (isVerified) {
                // Save Order to Firestore
                try {
                  const items = safeParsePrintJobs(printJobs);
                  // Use generated Order ID (ORD-...) as the primary ID, falling back to Razorpay ID
                  const orderId = generatedOrderId || response.razorpay_order_id || `ORD-${Date.now()}`;

                  // Priority: Prop (Directly from useProfile) -> Auth -> Session -> Local -> Fallback
                  const authUser = auth.currentUser;
                  const userName = userProfile?.name || authUser?.displayName || deobs(sessionStorage.getItem('userName')) || deobs(localStorage.getItem('userName')) || 'Guest';
                  const userPhone = userProfile?.mobile || authUser?.phoneNumber || deobs(sessionStorage.getItem('userPhone')) || deobs(localStorage.getItem('userPhone')) || '';
                  const userEmail = userProfile?.email || authUser?.email || deobs(sessionStorage.getItem('userEmail')) || deobs(localStorage.getItem('userEmail')) || '';

                  const newOrder = {
                    id: orderId,
                    customerId: auth.currentUser?.uid || '',
                    customerName: userName,
                    customerPhone: userPhone,
                    customerEmail: userEmail,
                    sellerPhone: '',
                    items: items,
                    total: amount,
                    status: 'pending',
                    timestamp: new Date().toISOString(),
                    shopId: shopId,
                    shopName: shopName || 'the shop',
                    isPaid: true,
                    paymentId: response.razorpay_payment_id,
                    otpVerified: false,
                    otpGeneratedAt: new Date().toISOString(),
                    otp: generateOTP().otp // Persist OTP to database for seller visibility
                  };

                  // Use setDoc to force the Document ID to match our Order ID
                  await setDoc(doc(db, 'orders', orderId), newOrder);

                  toast.dismiss();

                  // Pass the generated Order ID and OTP back
                  onSuccess({ ...response, orderId: orderId, otp: newOrder.otp });
                } catch (dbError: any) {
                  console.error('Error saving order to DB:', dbError);
                  toast.dismiss();
                  toast.error(`Critical Error: Order not saved. ${dbError.message}`);
                  // DO NOT call onSuccess here, so the user knows it failed
                  onError(dbError);
                }
              } else {
                toast.dismiss();
                toast.error('Payment verification failed');
                onError('Payment verification failed');
              }
            } catch (error) {
              toast.dismiss();
              console.error("Verification Error", error);
              toast.error('Payment verification error');
              onError(error);
            }
          },
          prefill: {
            name: localStorage.getItem('userName') || 'Customer',
            email: localStorage.getItem('userEmail') || 'customer@example.com',
            contact: localStorage.getItem('userPhone') || '',
            vpa: 'success@razorpay',
          },
          notes: {
            printJobs,
            shopId,
          },
          theme: {
            color: "#3b82f6",
          },
          modal: {
            ondismiss: async function () {
              const items = safeParsePrintJobs(printJobs);
              const orderId = generatedOrderId || `ORD-${Date.now()}`;
              const authUser = auth.currentUser;
              const userName = userProfile?.name || authUser?.displayName || deobs(sessionStorage.getItem('userName')) || deobs(localStorage.getItem('userName')) || 'Guest';
              const userPhone = userProfile?.mobile || authUser?.phoneNumber || deobs(sessionStorage.getItem('userPhone')) || deobs(localStorage.getItem('userPhone')) || '';
              const userEmail = userProfile?.email || authUser?.email || deobs(sessionStorage.getItem('userEmail')) || deobs(localStorage.getItem('userEmail')) || '';

              const newOrder = {
                id: orderId,
                customerId: auth.currentUser?.uid || '',
                customerName: userName,
                customerPhone: userPhone,
                customerEmail: userEmail,
                sellerPhone: '',
                items: items,
                total: amount,
                status: 'failed',
                timestamp: new Date().toISOString(),
                shopId: shopId,
                shopName: shopName || 'the shop',
                isPaid: false,
                paymentId: 'Cancelled by user',
                otpVerified: false,
                // No OTP generated for cancelled orders
              };
              try {
                await setDoc(doc(db, 'orders', orderId), newOrder);
              } catch (dbError) {
                console.error('Error saving cancelled order to DB:', dbError);
              }
              onError('Payment cancelled by user');
            }
          }
        };

        // Add order_id only if it exists (Server-side flow)
        if (orderData.orderId) {
          options.order_id = orderData.orderId;
        }

        const rzp1 = new window.Razorpay(options);
        rzp1.on('payment.failed', async function (response: any) {
          console.error(response.error);

          const items = safeParsePrintJobs(printJobs);
          const orderId = generatedOrderId || `ORD-${Date.now()}`;
          const authUser = auth.currentUser;
          const userName = userProfile?.name || authUser?.displayName || deobs(sessionStorage.getItem('userName')) || deobs(localStorage.getItem('userName')) || 'Guest';
          const userPhone = userProfile?.mobile || authUser?.phoneNumber || deobs(sessionStorage.getItem('userPhone')) || deobs(localStorage.getItem('userPhone')) || '';
          const userEmail = userProfile?.email || authUser?.email || deobs(sessionStorage.getItem('userEmail')) || deobs(localStorage.getItem('userEmail')) || '';

          const newOrder = {
            id: orderId,
            customerId: auth.currentUser?.uid || '',
            customerName: userName,
            customerPhone: userPhone,
            customerEmail: userEmail,
            sellerPhone: '',
            items: items,
            total: amount,
            status: 'failed',
            timestamp: new Date().toISOString(),
            shopId: shopId,
            shopName: shopName || 'the shop',
            isPaid: false,
            paymentId: response.error?.metadata?.payment_id || 'Failed Payment',
            paymentError: response.error?.description || 'Payment Failed',
            otpVerified: false,
            // No OTP generated for failed payments
          };
          try {
            await setDoc(doc(db, 'orders', orderId), newOrder);
          } catch (dbError) {
            console.error('Error saving failed order to DB:', dbError);
          }

          onError(response.error);
          toast.error(response.error.description || 'Payment failed');
        });

        rzp1.open();

      } catch (error) {
        console.error('Payment initiation error:', error);
        onError(error);
        toast.error('Failed to initiate payment');
      }
    };

    handlePayment();
  }, [amount, currency, receipt, printJobs, shopId, generatedOrderId]);

  return null;
};

export default RazorpayCheckout;