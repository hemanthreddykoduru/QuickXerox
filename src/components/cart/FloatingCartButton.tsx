import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CartButton from './CartButton';

interface FloatingCartButtonProps {
  itemCount: number;
  onClick: () => void;
  isVisible: boolean;
}

const FloatingCartButton: React.FC<FloatingCartButtonProps> = ({ itemCount, onClick, isVisible }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: 20 }}
          className="fixed bottom-6 right-6 z-40"
        >
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="bg-white rounded-full shadow-lg p-2"
          >
            <CartButton
              itemCount={itemCount}
              onClick={onClick}
              className="!p-3"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FloatingCartButton;