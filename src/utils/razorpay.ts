import { PaymentMethod } from '../types';
import { RAZORPAY_KEY } from '../config/constants';
import { API_BASE_URL } from '../config/constants';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const loadRazorpayScript = () => {
  return new Promise<void>((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
    document.body.appendChild(script);
  });
};

interface CreateOrderResponse {
  id: string;
  amount: number;
  currency: string;
  key_id?: string;
}

// Call backend to create order
const createRazorpayOrder = async (amount: number): Promise<CreateOrderResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount, // in INR
        currency: 'INR',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create order');
    }

    const data = await response.json();
    return {
      id: data.orderId,
      amount: data.amount,
      currency: data.currency,
      key_id: data.key_id // Get key_id from backend response
    };
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    throw error;
  }
};

export const initializeRazorpayPayment = async (
  amount: number,
  method: PaymentMethod,
  onSuccess: (response: any) => void,
  onError: (error: any) => void
) => {
  try {
    await loadRazorpayScript();
    const order = await createRazorpayOrder(amount);

    const options = {
      key: order.key_id || RAZORPAY_KEY, // Use backend key if available, else fallback
      amount: order.amount,
      currency: order.currency,
      name: 'QuickXerox',
      description: 'Print Service Payment',
      order_id: order.id,
      prefill: {
        name: localStorage.getItem('userName') || undefined,
        contact: localStorage.getItem('userPhone') || undefined,
        method
      },
      theme: {
        color: '#2563EB'
      },
      modal: {
        confirm_close: true,
        escape: false,
        handleback: true,
      },
      config: {
        display: {
          blocks: {
            utib: {
              name: 'Pay using UPI',
              instruments: [
                {
                  method: 'upi'
                },
                {
                  method: 'qr'
                }
              ]
            }
          },
          sequence: ['block.utib'],
          preferences: {
            show_default_blocks: false
          }
        }
      },
      handler: function (response: any) {
        onSuccess(response);
      },
    };

    // DEBUG: Alert the key being used
    alert(`DEBUG INFO:\nKey Used: ${options.key}\nBackend Order ID: ${order.id}`);

    const razorpay = new window.Razorpay(options);
    razorpay.on('payment.failed', onError);
    razorpay.open();
  } catch (error) {
    onError(error);
  }
};