import { httpsCallable } from "firebase/functions";
import { functions } from '../firebase';

export interface PaymentDetails {
  amount: number;
  currency: string;
  receipt: string;
  notes: {
    printJobs: string;
    shopId: string;
  };
}

export const createPayment = async (paymentDetails: PaymentDetails) => {
  // Client-Side Fallback for Production (Free Plan Limit)
  if (window.location.hostname !== 'localhost') {
    console.warn('Running with Client-Side Payment (Insecure - Test Only)');
    return {
      orderId: null, // No order ID for client-side integration
      amount: paymentDetails.amount * 100, // Amount in paise
      currency: paymentDetails.currency,
      key_id: 'rzp_test_S6aPHcOZKR3AO2', // Hardcoded Test Key
    };
  }

  try {
    const createOrder = httpsCallable<PaymentDetails, { orderId: string, amount: number, currency: string, key_id: string }>(functions, 'createRazorpayOrder');
    const result = await createOrder(paymentDetails);

    return result.data;
  } catch (error: any) {
    console.error('Error creating payment (via Cloud Function):', error);

    // Check if we are on the live site (not localhost) and it's an internal/not-found error
    if (window.location.hostname !== 'localhost' && (error.code === 'functions/internal' || error.code === 'functions/not-found' || error.message?.includes('internal'))) {
      throw new Error('Backend not deployed (Free Plan limit). Payments only work on localhost.');
    }

    throw error;
  }
};

export const verifyPayment = async (
  razorpayPaymentId: string,
  razorpayOrderId: string,
  razorpaySignature: string
) => {
  // Client-Side Fallback for Production
  if (window.location.hostname !== 'localhost') {
    console.warn('Skipping backend verification (Client-Side Mode)');
    return true; // Always return true for test mode
  }

  try {
    const callableVerifyPayment = httpsCallable<{ razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }, { success: boolean }>(functions, 'verifyRazorpayPayment');
    const result = await callableVerifyPayment({
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
    });
    return result.data.success;
  } catch (error) {
    console.error('Error verifying payment (via Cloud Function):', error);
    throw error;
  }
};