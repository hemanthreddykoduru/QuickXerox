import React from 'react';

const PaymentModal = ({
  isOpen,
  onClose,
  amount,
  onSelectPaymentMethod,
}: {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  onSelectPaymentMethod: (method: string) => void;
}) => {
  if (!isOpen) return null;

  const paymentMethods = [
    { id: 'upi', name: 'Pay with UPI', description: 'Fast and secure payment.' },
    { id: 'card', name: 'Credit/Debit Card', description: 'Pay with card.' },
    { id: 'netbanking', name: 'Net Banking', description: 'Pay with net banking.' },
    { id: 'wallet', name: 'Digital Wallet', description: 'Pay with digital wallet.' },
  ];

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-96">
        <h3 className="text-lg font-semibold mb-4">Payment</h3>
        <p className="mb-4">Amount to pay: ₹{amount.toFixed(2)}</p>
        {paymentMethods.map((method) => (
          <button
            key={method.id}
            className="w-full mb-2 p-2 bg-blue-600 text-white rounded"
            onClick={() => onSelectPaymentMethod(method.id)}
          >
            {method.name}
          </button>
        ))}
        <button
          className="w-full mt-4 p-2 bg-gray-300 rounded"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default PaymentModal;
