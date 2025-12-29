import React, { useEffect } from 'react';
import { createCashfreePayment } from '../services/paymentService';

interface CashfreeCheckoutProps {
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
    Cashfree: any;
  }
}

const CashfreeCheckout: React.FC<CashfreeCheckoutProps> = ({
  amount,
  currency,
  receipt,
  printJobs,
  shopId,
  onSuccess,
  onError,
}) => {
  useEffect(() => {
    const loadCashfree = async () => {
      try {
        const script = document.createElement('script');
        script.src = 'https://sdk.cashfree.com/js/ui/2.0.0/cashfree.prod.js';
        script.async = true;
        document.body.appendChild(script);

        script.onload = async () => {
          try {
            const order = await createCashfreePayment({
              amount,
              currency,
              receipt,
              notes: {
                printJobs,
                shopId,
              },
            });
            console.log('Order from backend:', order);

            // Use type assertions to access possible order token properties
            const orderToken = (order as any).order_token || (order as any).orderToken || order.orderId;
            const paymentConfig = {
              orderToken,
              orderNumber: order.orderId,
              appId: import.meta.env.VITE_CASHFREE_APP_ID || 'TEST1234567890',
              orderAmount: order.amount,
              orderCurrency: order.currency,
              orderNote: "Print Job Payment",
              customerName: localStorage.getItem('userName') || 'Customer',
              customerPhone: localStorage.getItem('userPhone') || '+919999999999',
              customerEmail: 'customer@example.com',
              hideOrderId: true,
              style: {
                backgroundColor: "#ffffff",
                color: "#11385b",
                fontFamily: "Lato",
                fontSize: "14px",
                errorColor: "#ff0000",
                theme: "light"
              },
              mode: "sandbox", // or "production"
              onSuccess: (data: any) => { onSuccess(data); },
              onFailure: (data: any) => { onError(data); }
            };

            console.log('Payment config:', paymentConfig);

            if (window.Cashfree && typeof window.Cashfree.checkout === 'function') {
              window.Cashfree.checkout(paymentConfig);
            } else {
              console.error('Cashfree SDK not loaded');
              onError('Cashfree SDK not loaded');
            }
          } catch (error) {
            onError(error);
          }
        };
      } catch (error) {
        onError(error);
      }
    };

    loadCashfree();
  }, [amount, currency, receipt, printJobs, shopId, onSuccess, onError]);

  return null;
};

export default CashfreeCheckout; 