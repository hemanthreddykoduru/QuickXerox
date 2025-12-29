import { useState } from 'react';
import { PaymentMethod } from '../types';
import { initializeCashfreePayment } from '../utils/cashfree';
import { toast } from 'react-hot-toast';

interface UsePaymentProps {
  amount: number;
  onSuccess: () => void;
  onError: (error: any) => void;
}

export const usePayment = ({ amount, onSuccess, onError }: UsePaymentProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handlePayment = async (method: PaymentMethod) => {
    setIsLoading(true);

    try {
      await initializeCashfreePayment(
        amount,
        method,
        (response: any) => {
          setIsLoading(false);
          toast.success('Payment successful!');
          onSuccess();
          // In a real app, verify the payment with your backend here
          console.log('Payment success:', response);
        },
        (error: any) => {
          setIsLoading(false);
          toast.error('Payment failed. Please try again.');
          onError(error);
          console.error('Payment error:', error);
        }
      );
    } catch (error) {
      setIsLoading(false);
      toast.error('Failed to initialize payment. Please try again.');
      onError(error);
    }
  };

  return {
    handlePayment,
    isLoading
  };
};