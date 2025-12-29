import { PaymentMethod } from '../types';
import { CASHFREE_APP_ID } from '../config/constants';

declare global {
  interface Window {
    Cashfree: any;
  }
}

export const loadCashfreeScript = () => {
  return new Promise<void>((resolve, reject) => {
    if (window.Cashfree) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/ui/2.0.0/cashfree.prod.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Cashfree SDK'));
    document.body.appendChild(script);
  });
};

interface CreateOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
}

// In a real app, this would be an API call to your backend
const createCashfreeOrder = async (amount: number): Promise<CreateOrderResponse> => {
  // Simulate API call
  return {
    orderId: 'order_' + Math.random().toString(36).substr(2, 9),
    amount: amount,
    currency: 'INR'
  };
};

export const initializeCashfreePayment = async (
  amount: number,
  method: PaymentMethod,
  onSuccess: (response: any) => void,
  onError: (error: any) => void
) => {
  try {
    await loadCashfreeScript();
    const order = await createCashfreeOrder(amount);

    const paymentConfig = {
      orderToken: order.orderId,
      orderNumber: order.orderId,
      appId: CASHFREE_APP_ID,
      orderAmount: order.amount,
      orderCurrency: order.currency,
      orderNote: "Print Service Payment",
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

    window.Cashfree.checkout(paymentConfig);
  } catch (error) {
    onError(error);
  }
}; 