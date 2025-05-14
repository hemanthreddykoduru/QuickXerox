import { PaymentMethod } from '../types';
import { RAZORPAY_KEY } from '../config/constants';
import { initializeRazorpayPayment } from '../utils/razorpay';

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill: {
    name?: string;
    contact?: string;
    method: PaymentMethod;
  };
  theme: {
    color: string;
  };
  modal: {
    ondismiss: () => void;
  };
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
  };
}

export const createRazorpayOptions = (
  amount: number,
  method: PaymentMethod,
  onDismiss: () => void
): RazorpayOptions => ({
  key: RAZORPAY_KEY,
  amount: amount * 100, // Amount in paise
  currency: 'INR',
  name: 'QuickXerox',
  description: 'Print Service Payment',
  prefill: {
    name: localStorage.getItem('userName') || 'User',
    contact: localStorage.getItem('userPhone') || '+91 99999 99999',
    method
  },
  theme: {
    color: '#2563EB'
  },
  modal: {
    ondismiss: onDismiss
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
  }
});

const handlePayNow = () => {
  const amount = 100; // Amount in INR
  const method: PaymentMethod = 'upi'; // or 'qr', etc.

  initializeRazorpayPayment(
    amount,
    method,
    (response) => {
      // Success handler
      alert('Payment Successful! Payment ID: ' + response.razorpay_payment_id);
      // You can also redirect or update UI here
    },
    (error) => {
      // Error handler
      alert('Payment Failed: ' + (error?.error?.description || 'Unknown error'));
    }
  );
};

// Added Pay Now button
<button onClick={handlePayNow}>Pay Now</button>