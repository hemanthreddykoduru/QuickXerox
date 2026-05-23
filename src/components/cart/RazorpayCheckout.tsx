import React, { useEffect, useRef } from 'react';
import { createPayment, verifyPayment, cancelOrder } from '../../services/paymentService';
import { deobs } from '../../utils/security';
import { toast } from 'react-hot-toast';
import { db, auth } from '../../firebase';
import { updateDoc, doc } from 'firebase/firestore';

interface RazorpayCheckoutProps {
  amount: number;
  currency: string;
  receipt: string;
  printJobs: string;
  shopId: string;
  generatedOrderId?: string;
  couponCode?: string;
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
  generatedOrderId,
  couponCode,
  userProfile,
  onSuccess,
  onError,
}) => {
  const paymentInitiatedRef = useRef(false);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
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
    if (paymentInitiatedRef.current) return;
    paymentInitiatedRef.current = true;

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

        // Priority: Prop (Directly from useProfile) -> Auth -> Session -> Local -> Fallback
        const authUser = auth.currentUser;
        const userName = userProfile?.name || authUser?.displayName || deobs(sessionStorage.getItem('userName')) || deobs(localStorage.getItem('userName')) || 'Guest';
        const userPhone = userProfile?.mobile || authUser?.phoneNumber || deobs(sessionStorage.getItem('userPhone')) || deobs(localStorage.getItem('userPhone')) || '';
        const userEmail = userProfile?.email || authUser?.email || deobs(sessionStorage.getItem('userEmail')) || deobs(localStorage.getItem('userEmail')) || '';

        // 1. Create Order via Backend
        const orderData = await createPayment({
          shopId,
          items: safeParsePrintJobs(printJobs),
          currency,
          receipt, // Pass the ORD- format receipt
          couponCode,
          userId: auth.currentUser?.uid,
          customerName: userName,
          customerEmail: userEmail,
          customerPhone: userPhone,
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
              const verificationResult = await verifyPayment(
                response.razorpay_payment_id,
                response.razorpay_order_id,
                response.razorpay_signature
              );

              if (verificationResult && (verificationResult as any).success) {
                try {
                  const orderId = orderData.orderId;
                  const otp = (verificationResult as any).otp || '';
                  
                  toast.dismiss();
                  onSuccess({ ...response, orderId: orderId, otp: otp });
                } catch (dbError: any) {
                  console.error('Error handling post-verification:', dbError);
                  toast.dismiss();
                  toast.error(`Error: ${dbError.message}`);
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
            name: userName || 'Customer',
            email: userEmail || 'customer@example.com',
            contact: userPhone || '',
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
              console.log('Razorpay modal dismissed by user');
              const orderId = orderData.orderId;
              try {
                // Silent cancellation via API
                await cancelOrder(orderId);
                console.log(`Order ${orderId} marked as cancelled via API`);
              } catch (dbError: any) {
                console.error('Error updating cancelled order:', dbError);
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
          console.error('Razorpay Payment Failed:', response.error);

          const orderId = orderData.orderId;
          try {
            const orderRef = doc(db, 'orders', orderId);
            await updateDoc(orderRef, {
              status: 'failed',
              paymentId: response.error?.metadata?.payment_id || 'Failed Payment',
              paymentError: response.error?.description || 'Payment Failed',
              updatedAt: new Date().toISOString()
            });
            console.log(`Order ${orderId} marked as failed`);
          } catch (dbError) {
            console.error('Error updating failed order in DB:', dbError);
          }

          toast.error(response.error.description || 'Payment failed');
          onError(response.error);
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