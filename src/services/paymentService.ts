import { functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';

const VERCEL_API_URL = 'https://quickxerox-api.vercel.app/api';

interface PaymentDetails {
  amount: number;
  currency: string;
}

/**
 * Initialize Payment
 */
export const createPayment = async (paymentDetails: {
  amount: number;
  currency: string;
}) => {
  try {
    // Call Vercel API instead of Firebase Cloud Function
    const response = await fetch(`${VERCEL_API_URL}/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentDetails),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create order');
    }

    const data = await response.json();
    return data; // Returns { orderId, amount, currency, key_id }

  } catch (error) {
    console.error('Error creating payment order:', error);
    throw error;
  }
};

/**
 * Verify Payment
 */
export const verifyPayment = async (
  razorpayPaymentId: string,
  razorpayOrderId: string,
  razorpaySignature: string
) => {
  try {
    const response = await fetch(`${VERCEL_API_URL}/verify-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Payment verification failed');
    }

    return await response.json(); // Returns { success: true }

  } catch (error) {
    console.error('Error verifying payment:', error);
    throw error;
  }
};