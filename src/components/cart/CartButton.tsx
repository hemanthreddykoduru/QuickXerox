import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

interface CartButtonProps {
  itemCount: number;
  onClick: () => void;
  className?: string;
}

const CartButton: React.FC<CartButtonProps> = ({ itemCount, onClick, className = '' }) => {
  return (
    <button
      onClick={onClick}
      className={`relative p-1.5 text-gray-600 hover:text-blue-600 transition-colors ${className}`}
    >
      <ShoppingCart className="h-5 w-5" />
      <AnimatePresence>
        {itemCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 bg-indigo-600 text-white text-[9px] sm:text-xs font-black rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center shadow-sm"
          >
            {itemCount}
          </span>
        )}
      </AnimatePresence>
    </button>
  );
};

export default CartButton;