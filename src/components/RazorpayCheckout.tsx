import React, { useEffect } from 'react';
import { createPayment } from '../services/paymentService';

interface RazorpayCheckoutProps {
  amount: number;
  currency: string;
  receipt: string;
  printJobs: string;
  shopId: string;
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
  onSuccess,
  onError,
}) => {
  useEffect(() => {
    const loadRazorpay = async () => {
      try {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);

        script.onload = async () => {
          try {
            const order = await createPayment({
              amount,
              currency,
              receipt,
              notes: {
                printJobs,
                shopId,
              },
            });

            const options = {
              key: process.env.VITE_RAZORPAY_KEY_ID,
              amount: order.amount,
              currency: order.currency,
              name: 'QuickXerox',
              description: 'Print Job Payment',
              order_id: order.id,
              handler: function (response: any) {
                onSuccess(response);
              },
              prefill: {
                name: 'Customer Name',
                email: 'customer@example.com',
                contact: '9999999999',
              },
              theme: {
                color: '#2563EB',
              },
            };

            const razorpay = new window.Razorpay(options);
            razorpay.open();
          } catch (error) {
            onError(error);
          }
        };
      } catch (error) {
        onError(error);
      }
    };

    loadRazorpay();
  }, [amount, currency, receipt, printJobs, shopId, onSuccess, onError]);

  return null;
};

export default RazorpayCheckout; 