import React from 'react';
import { motion } from 'framer-motion';

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
    { id: 'qr', name: 'Pay with QR Code', description: 'Scan the code to pay.' },
  ];

  return (
    <motion.div
      className="fixed inset-0 bg-gray-800 bg-opacity-75 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="bg-white rounded-lg p-6 w-96">
        <h3 className="text-lg font-semibold mb-4">Payment</h3>
        <p className="mb-4">Amount to pay: ₹{amount.toFixed(2)}</p>
        {paymentMethods.map((method) => (
          <motion.button
            key={method.id}
            className="w-full mb-2 p-2 bg-blue-600 text-white rounded"
            onClick={() => onSelectPaymentMethod(method.id)}
          >
            {method.name}
          </motion.button>
        ))}
        <button
          className="w-full mt-4 p-2 bg-gray-300 rounded"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </motion.div>
  );
};

export default PaymentModal;
