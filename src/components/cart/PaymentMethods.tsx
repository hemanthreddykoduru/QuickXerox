import React, { useState } from 'react';
import { CreditCard, Wallet, QrCode, IndianRupee } from 'lucide-react';

interface PaymentMethodsProps {
  amount: number;
  onPaymentComplete: (method: string) => void;
  onClose: () => void;
}

const PaymentMethods: React.FC<PaymentMethodsProps> = ({
  amount,
  onPaymentComplete,
  onClose,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<string>('');

  const paymentOptions = [
    {
      id: 'card',
      name: 'Credit/Debit Card',
      icon: CreditCard,
      description: 'Pay using credit or debit card',
    },
    {
      id: 'upi',
      name: 'UPI',
      icon: QrCode,
      description: 'Pay using UPI apps',
    },
    {
      id: 'wallet',
      name: 'Digital Wallet',
      icon: Wallet,
      description: 'Pay using digital wallet',
    },
  ];

  const handlePayment = (method: string) => {
    setSelectedMethod(method);
    // Simulate payment processing
    setTimeout(() => {
      onPaymentComplete(method);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-md">
        {/* Header */}
        <div className="p-6 border-b">
          <h3 className="text-xl font-semibold text-gray-900">Select Payment Method</h3>
          <p className="text-gray-600 mt-1">Total Amount: ₹{amount.toFixed(2)}</p>
        </div>

        {/* Payment Options */}
        <div className="p-6 space-y-4">
          {paymentOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => handlePayment(option.id)}
              disabled={selectedMethod !== ''}
              className={`w-full p-4 rounded-lg border ${
                selectedMethod === option.id
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-600'
              } transition-colors`}
            >
              <div className="flex items-center space-x-4">
                <div
                  className={`p-2 rounded-full ${
                    selectedMethod === option.id ? 'bg-blue-600' : 'bg-gray-100'
                  }`}
                >
                  <option.icon
                    className={`h-6 w-6 ${
                      selectedMethod === option.id ? 'text-white' : 'text-gray-600'
                    }`}
                  />
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-medium text-gray-900">{option.name}</h4>
                  <p className="text-sm text-gray-600">{option.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="p-6 border-t">
          <button
            onClick={onClose}
            disabled={selectedMethod !== ''}
            className="w-full px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethods; 