import React, { useState, useEffect, useRef } from 'react';
import { Shield, CheckCircle, X, Clock, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface OTPVerificationProps {
  orderId: string;
  customerPhone: string;
  sellerPhone: string;
  onVerificationSuccess: () => void;
  onVerificationFailed: () => void;
  onClose: () => void;
  isOpen: boolean;
}

const OTPVerification: React.FC<OTPVerificationProps> = ({
  orderId,
  customerPhone,
  sellerPhone,
  onVerificationSuccess,
  onVerificationFailed,
  onClose,
  isOpen
}) => {
  const [otp, setOtp] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [canResend, setCanResend] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isOpen) {
      setOtp('');
      setTimeLeft(300);
      setAttempts(0);
      setCanResend(false);
      generateOTP();
      startTimer();
    }
  }, [isOpen]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [timeLeft]);

  const generateOTP = async () => {
    try {
      // Generate a 4-digit OTP
      const generatedOTP = Math.floor(1000 + Math.random() * 9000).toString();
      
      // In a real app, this would be sent via SMS to both customer and seller
      // For demo purposes, we'll store it in localStorage
      localStorage.setItem(`otp_${orderId}`, generatedOTP);
      localStorage.setItem(`otp_${orderId}_timestamp`, Date.now().toString());
      
      // Simulate sending OTP to customer and seller
      console.log(`OTP ${generatedOTP} sent to customer: ${customerPhone}`);
      console.log(`OTP ${generatedOTP} sent to seller: ${sellerPhone}`);
      
      toast.success('OTP sent to both customer and seller!');
    } catch (error) {
      console.error('Error generating OTP:', error);
      toast.error('Failed to send OTP. Please try again.');
    }
  };

  const startTimer = () => {
    setTimeLeft(300);
    setCanResend(false);
  };

  const handleOTPChange = (index: number, value: string) => {
    if (value.length > 1) return;
    
    const newOtp = otp.split('');
    newOtp[index] = value;
    setOtp(newOtp.join(''));

    // Move to next input if value is entered
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 4);
    setOtp(pastedData);
    inputRefs.current[Math.min(pastedData.length, 3)]?.focus();
  };

  const verifyOTP = async () => {
    if (otp.length !== 4) {
      toast.error('Please enter the complete 4-digit OTP');
      return;
    }

    setIsVerifying(true);
    
    try {
      // Get stored OTP
      const storedOTP = localStorage.getItem(`otp_${orderId}`);
      const otpTimestamp = localStorage.getItem(`otp_${orderId}_timestamp`);
      
      if (!storedOTP || !otpTimestamp) {
        toast.error('OTP not found. Please request a new one.');
        setIsVerifying(false);
        return;
      }

      // Check if OTP is expired (5 minutes)
      const isExpired = Date.now() - parseInt(otpTimestamp) > 300000;
      if (isExpired) {
        toast.error('OTP has expired. Please request a new one.');
        setIsVerifying(false);
        return;
      }

      // Verify OTP
      if (otp === storedOTP) {
        // Clear OTP from storage
        localStorage.removeItem(`otp_${orderId}`);
        localStorage.removeItem(`otp_${orderId}_timestamp`);
        
        toast.success('OTP verified successfully! Order confirmed.');
        onVerificationSuccess();
      } else {
        setAttempts(attempts + 1);
        if (attempts >= 2) {
          toast.error('Too many failed attempts. Please request a new OTP.');
          onVerificationFailed();
        } else {
          toast.error(`Invalid OTP. ${2 - attempts} attempts remaining.`);
        }
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      toast.error('Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const resendOTP = async () => {
    if (!canResend) return;
    
    await generateOTP();
    startTimer();
    toast.success('New OTP sent!');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Verify Order</h3>
              <p className="text-sm text-gray-500">Enter the 4-digit OTP</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close verification"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Order Info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between text-sm">
            <div>
              <p className="font-medium text-gray-900">Order #{orderId.slice(-8)}</p>
              <p className="text-gray-500">Customer: {customerPhone}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-500">Seller: {sellerPhone}</p>
              <p className="text-gray-500">Both parties received OTP</p>
            </div>
          </div>
        </div>

        {/* OTP Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
            Enter 4-digit OTP
          </label>
          <div className="flex justify-center space-x-3">
            {[0, 1, 2, 3].map((index) => (
              <input
                key={index}
                ref={el => inputRefs.current[index] = el}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={otp[index] || ''}
                onChange={(e) => handleOTPChange(index, e.target.value.replace(/[^0-9]/g, ''))}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className="w-14 h-14 text-center text-2xl font-bold border-2 border-blue-300 bg-white rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors shadow-sm"
                disabled={isVerifying}
                aria-label={`OTP digit ${index + 1}`}
                title={`Enter digit ${index + 1} of the OTP`}
              />
            ))}
          </div>
        </div>

        {/* Timer and Resend */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-500">
              {timeLeft > 0 ? `Expires in ${formatTime(timeLeft)}` : 'OTP Expired'}
            </span>
          </div>
          <button
            onClick={resendOTP}
            disabled={!canResend || isVerifying}
            className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${canResend ? 'animate-spin' : ''}`} />
            <span className="text-sm font-medium">Resend OTP</span>
          </button>
        </div>

        {/* Verify Button */}
        <button
          onClick={verifyOTP}
          disabled={otp.length !== 4 || isVerifying}
          className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isVerifying ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              <span>Verifying...</span>
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4" />
              <span>Verify OTP</span>
            </>
          )}
        </button>

        {/* Instructions */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-700 text-center">
            Both you and the seller have received the same OTP. 
            Enter it to confirm the order pickup.
          </p>
        </div>
      </div>
    </div>
  );
};

export default OTPVerification;
