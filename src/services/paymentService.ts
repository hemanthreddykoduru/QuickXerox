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
    const response = await fetch('https://us-central1-otp-project-aafc6.cloudfunctions.net/createRazorpayOrderHttp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentDetails),
    });

    if (!response.ok) {
      throw new Error('Failed to create Razorpay order');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating payment (via HTTP Cloud Function):', error);
    throw error;
  }
};

export const createCashfreePayment = async (paymentDetails: PaymentDetails) => {
  try {
    // For now, we'll simulate the Cashfree order creation
    // In a real implementation, you would call your backend API
    const orderId = 'cf_order_' + Math.random().toString(36).substr(2, 9);
    
    return {
      orderId: orderId,
      amount: paymentDetails.amount,
      currency: paymentDetails.currency,
      status: 'created'
    };
  } catch (error) {
    console.error('Error creating Cashfree payment:', error);
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

export const verifyCashfreePayment = async (
  cashfreePaymentId: string,
  cashfreeOrderId: string,
  cashfreeSignature: string
) => {
  try {
    // For now, we'll simulate the verification
    // In a real implementation, you would call your backend API
    return true;
  } catch (error) {
    console.error('Error verifying Cashfree payment:', error);
    throw error;
  }
}; 