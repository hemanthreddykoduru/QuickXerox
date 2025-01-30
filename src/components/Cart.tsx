import React, { useEffect, useState } from 'react';
import { ShoppingCart, Trash2, X } from 'lucide-react';
import { PrintJob, PrintShop } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import PaymentModal from './PaymentModal';
import { usePayment } from '../hooks/usePayment';
import { toast } from 'react-hot-toast';

interface CartProps {
  items: PrintJob[];
  onRemove: (id: string) => void;
  basePrice: number;
  isOpen: boolean;
  onClose: () => void;
  selectedShop: PrintShop | null;
  onShopSelect: (shopId: number) => void;
  shops: PrintShop[];
}

const Cart: React.FC<CartProps> = ({ 
  items, 
  onRemove, 
  basePrice, 
  isOpen, 
  onClose,
  selectedShop,
  onShopSelect,
  shops
}) => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Prevent body scroll when cart is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const calculateTotal = () => {
    return items.reduce((total, item) => {
      const pricePerPage = item.isColor ? basePrice * 2.5 : basePrice;
      return total + (pricePerPage * item.copies);
    }, 0);
  };

  const { handlePayment, isLoading } = usePayment({
    amount: calculateTotal(),
    onSuccess: () => {
      toast.success('Payment successful!');
      setShowPaymentModal(false);
      onClose();
    },
    onError: (error) => {
      toast.error('Payment failed. Please try again.');
      console.error('Payment error:', error);
    }
  });

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={onClose}
            />

            <motion.div 
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ 
                type: 'spring', 
                damping: 30, 
                stiffness: 300,
                mass: 0.8
              }}
              className="fixed inset-y-0 right-0 max-w-[90vw] w-96 bg-white shadow-xl z-50 flex flex-col"
            >
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="p-4 border-b border-gray-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ShoppingCart className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold text-lg">Print Cart</h3>
                  </div>
                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onClose}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </motion.button>
                </div>
              </motion.div>

              {items.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="flex-1 flex items-center justify-center p-4"
                >
                  <p className="text-gray-500">Your cart is empty</p>
                </motion.div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto">
                    <motion.div 
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="p-4 border-b border-gray-200"
                    >
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Print Shop
                      </label>
                      <select
                        value={selectedShop?.id || ''}
                        onChange={(e) => onShopSelect(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      >
                        <option value="">Choose a shop</option>
                        {shops.map((shop) => (
                          <option key={shop.id} value={shop.id}>
                            {shop.name} - ${shop.price}/page ({shop.distance} mi)
                          </option>
                        ))}
                      </select>
                    </motion.div>

                    <div className="divide-y divide-gray-200">
                      {items.map((item, index) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: 50 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 50 }}
                          transition={{ 
                            delay: index * 0.1,
                            type: 'spring',
                            damping: 20,
                            stiffness: 200
                          }}
                          className="p-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-900">{item.file.name}</p>
                              <p className="text-sm text-gray-600">
                                {item.copies} {item.copies === 1 ? 'copy' : 'copies'} • 
                                {item.isColor ? ' Color' : ' B&W'}
                              </p>
                            </div>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => onRemove(item.id)}
                              className="text-red-500 hover:text-red-700 transition-colors"
                            >
                              <Trash2 className="h-5 w-5" />
                            </motion.button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="p-4 bg-gray-50 border-t border-gray-200"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-semibold">Total:</span>
                      <motion.span 
                        key={calculateTotal()}
                        initial={{ scale: 1.1 }}
                        animate={{ scale: 1 }}
                        className="font-bold text-lg"
                      >
                        ₹{calculateTotal().toFixed(2)}
                      </motion.span>
                    </div>
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowPaymentModal(true)}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed"
                      disabled={!selectedShop || isLoading}
                    >
                      {isLoading ? 'Processing...' : selectedShop ? 'Proceed to Payment' : 'Select a Print Shop'}
                    </motion.button>
                  </motion.div>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        amount={calculateTotal()}
        onSelectPaymentMethod={handlePayment}
      />
    </>
  );
};

export default Cart;