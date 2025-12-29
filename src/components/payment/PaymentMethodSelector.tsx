import React, { useState } from 'react';
import { CreditCard, Smartphone, Building, Wallet, QrCode, Banknote } from 'lucide-react';
import { PaymentMethod } from '../../types';

interface PaymentMethodOption {
  id: PaymentMethod;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  isPopular?: boolean;
  isAvailable?: boolean;
}

interface PaymentMethodSelectorProps {
  amount: number;
  onMethodSelect: (method: PaymentMethod) => void;
  selectedMethod?: PaymentMethod;
}

const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  amount,
  onMethodSelect,
  selectedMethod
}) => {
  const [hoveredMethod, setHoveredMethod] = useState<PaymentMethod | null>(null);

  const paymentMethods: PaymentMethodOption[] = [
    {
      id: 'upi',
      name: 'UPI',
      description: 'Pay with UPI apps like Google Pay, PhonePe',
      icon: Smartphone,
      isPopular: true,
      isAvailable: true
    },
    {
      id: 'card',
      name: 'Credit/Debit Card',
      description: 'Visa, Mastercard, RuPay cards',
      icon: CreditCard,
      isPopular: true,
      isAvailable: true
    },
    {
      id: 'netbanking',
      name: 'Net Banking',
      description: 'Direct bank transfer',
      icon: Building,
      isAvailable: true
    },
    {
      id: 'wallet',
      name: 'Digital Wallet',
      description: 'Paytm, Mobikwik, Freecharge',
      icon: Wallet,
      isAvailable: true
    }
  ];

  const getMethodIcon = (method: PaymentMethodOption) => {
    const IconComponent = method.icon;
    return <IconComponent className="h-6 w-6" />;
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900">Choose Payment Method</h3>
        <p className="text-sm text-gray-600">Total Amount: ₹{amount.toFixed(2)}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {paymentMethods.map((method) => (
          <button
            key={method.id}
            onClick={() => onMethodSelect(method.id)}
            onMouseEnter={() => setHoveredMethod(method.id)}
            onMouseLeave={() => setHoveredMethod(null)}
            disabled={!method.isAvailable}
            className={`relative p-4 rounded-lg border-2 transition-all duration-200 ${
              selectedMethod === method.id
                ? 'border-blue-500 bg-blue-50'
                : hoveredMethod === method.id
                ? 'border-blue-300 bg-blue-25'
                : 'border-gray-200 hover:border-gray-300'
            } ${!method.isAvailable ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {method.isPopular && (
              <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                Popular
              </div>
            )}
            
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${
                selectedMethod === method.id
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {getMethodIcon(method)}
              </div>
              
              <div className="flex-1 text-left">
                <h4 className="font-medium text-gray-900">{method.name}</h4>
                <p className="text-sm text-gray-600">{method.description}</p>
              </div>
            </div>

            {selectedMethod === method.id && (
              <div className="absolute top-2 right-2">
                <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Additional Payment Options */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Other Options</h4>
        <div className="space-y-2">
          <button className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center space-x-3">
              <QrCode className="h-5 w-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-900">QR Code Payment</span>
            </div>
            <span className="text-xs text-gray-500">Scan to pay</span>
          </button>
          
          <button className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center space-x-3">
              <Banknote className="h-5 w-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-900">Cash on Delivery</span>
            </div>
            <span className="text-xs text-gray-500">Pay when you collect</span>
          </button>
        </div>
      </div>

      {/* Security Notice */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm text-green-800 font-medium">Secure Payment</span>
        </div>
        <p className="text-xs text-green-700 mt-1">
          Your payment information is encrypted and secure. We never store your card details.
        </p>
      </div>
    </div>
  );
};

export default PaymentMethodSelector;
