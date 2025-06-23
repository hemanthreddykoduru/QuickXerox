import React from 'react';
import { CheckCircle, Sparkles } from 'lucide-react';

interface SuccessToastProps {
  message: string;
  onClose?: () => void;
}

const SuccessToast: React.FC<SuccessToastProps> = ({ message, onClose }) => {
  return (
    <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl shadow-2xl border border-green-400/20 backdrop-blur-sm animate-in slide-in-from-top-2 duration-300">
      <div className="flex-shrink-0">
        <div className="relative">
          <CheckCircle className="h-6 w-6 text-white" />
          <Sparkles className="h-3 w-3 text-yellow-300 absolute -top-1 -right-1 animate-pulse" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-5">{message}</p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 text-white/80 hover:text-white transition-colors"
          aria-label="Close notification"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default SuccessToast; 