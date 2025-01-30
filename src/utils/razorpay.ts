import { PaymentMethod } from '../types';
import { RAZORPAY_KEY } from '../config/constants';

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
}

// In a real app, this would be an API call to your backend
const createRazorpayOrder = async (amount: number): Promise<CreateOrderResponse> => {
  // Simulate API call
  return {
    id: 'order_' + Math.random().toString(36).substr(2, 9),
    amount: amount * 100, // Convert to paise
    currency: 'INR'
  };
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
      key: RAZORPAY_KEY,
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
      handler: function(response: any) {
        onSuccess(response);
      },
    };

    const razorpay = new window.Razorpay(options);
    razorpay.on('payment.failed', onError);
    razorpay.open();
  } catch (error) {
    onError(error);
  }
};