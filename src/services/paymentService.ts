import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from '../firebase'; // Import the initialized Firebase app

const functions = getFunctions(app);

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
  try {
    const callableCreateOrder = httpsCallable<PaymentDetails, { orderId: string; amount: number; currency: string; key_id: string }>(functions, 'createRazorpayOrder');
    const result = await callableCreateOrder(paymentDetails);
    return result.data;
  } catch (error) {
    console.error('Error creating payment (via Cloud Function):', error);
    throw error;
  }
};

export const verifyPayment = async (
  razorpayPaymentId: string,
  razorpayOrderId: string,
  razorpaySignature: string
) => {
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