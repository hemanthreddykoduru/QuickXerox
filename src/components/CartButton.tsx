import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CartButtonProps {
  itemCount: number;
  onClick: () => void;
  className?: string;
}

const CartButton: React.FC<CartButtonProps> = ({ itemCount, onClick, className = '' }) => {
  return (
    <button
      onClick={onClick}
      className={`relative p-2 text-gray-600 hover:text-blue-600 transition-colors ${className}`}
    >
      <ShoppingCart className="h-6 w-6" />
      <AnimatePresence>
        {itemCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center"
          >
            {itemCount}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
};

export default CartButton;