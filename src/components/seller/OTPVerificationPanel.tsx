import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle, Clock, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface OTPVerificationPanelProps {
  orderId: string;
  customerPhone: string;
  onVerificationComplete: () => void;
}

const OTPVerificationPanel: React.FC<OTPVerificationPanelProps> = ({
  orderId,
  customerPhone,
  onVerificationComplete
}) => {
  const [otp, setOtp] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [storedOTP, setStoredOTP] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    // Check for stored OTP
    const stored = localStorage.getItem(`otp_${orderId}`);
    const timestamp = localStorage.getItem(`otp_${orderId}_timestamp`);
    
    if (stored && timestamp) {
      setStoredOTP(stored);
      
      // Check if OTP is expired
      const isExpired = Date.now() - parseInt(timestamp) > 300000; // 5 minutes
      setIsExpired(isExpired);
      
      if (!isExpired) {
        // Calculate remaining time
        const remaining = Math.max(0, 300 - Math.floor((Date.now() - parseInt(timestamp)) / 1000));
        setTimeLeft(remaining);
        
        // Start countdown
        const timer = setInterval(() => {
          setTimeLeft(prev => {
            if (prev <= 1) {
              setIsExpired(true);
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        
        return () => clearInterval(timer);
      }
    }
  }, [orderId]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOTPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
    setOtp(value);
  };

  const verifyOTP = async () => {
    if (otp.length !== 4) {
      toast.error('Please enter the complete 4-digit OTP');
      return;
    }

    setIsVerifying(true);
    
    try {
      // Verify OTP
      if (otp === storedOTP) {
        toast.success('OTP verified successfully! Order confirmed.');
        onVerificationComplete();
      } else {
        toast.error('Invalid OTP. Please check and try again.');
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      toast.error('Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const resendOTP = () => {
    // Generate new OTP
    const newOTP = Math.floor(1000 + Math.random() * 9000).toString();
    localStorage.setItem(`otp_${orderId}`, newOTP);
    localStorage.setItem(`otp_${orderId}_timestamp`, Date.now().toString());
    
    setStoredOTP(newOTP);
    setIsExpired(false);
    setTimeLeft(300);
    
    toast.success('New OTP generated!');
  };

  if (!storedOTP) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <Clock className="h-5 w-5 text-yellow-600" />
          <span className="text-yellow-800 font-medium">Waiting for OTP...</span>
        </div>
        <p className="text-sm text-yellow-700 mt-1">
          The customer will receive an OTP after payment completion.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-blue-600" />
          <h4 className="font-semibold text-gray-900">OTP Verification</h4>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowOTP(!showOTP)}
            className="text-gray-500 hover:text-gray-700"
            title={showOTP ? "Hide OTP" : "Show OTP"}
          >
            {showOTP ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* OTP Display */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
        <div className="text-center">
          <p className="text-sm text-blue-700 mb-2">Customer OTP</p>
          <div className="flex justify-center space-x-2 mb-2">
            {storedOTP.split('').map((digit, index) => (
              <div
                key={index}
                className="w-10 h-10 border-2 border-blue-300 bg-white rounded-lg flex items-center justify-center"
              >
                <span className="text-lg font-bold text-blue-600">
                  {showOTP ? digit : '•'}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-blue-600">
            Customer: {customerPhone}
          </p>
        </div>
      </div>

      {/* Timer */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-500">
            {isExpired ? 'OTP Expired' : `Expires in ${formatTime(timeLeft)}`}
          </span>
        </div>
        <button
          onClick={resendOTP}
          className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Resend</span>
        </button>
      </div>

      {/* Verification Input */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Enter OTP from Customer
          </label>
          <div className="flex justify-center space-x-2">
            {Array.from({ length: 4 }, (_, index) => (
              <input
                key={index}
                type="text"
                maxLength={1}
                value={otp[index] || ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  if (value.length <= 1) {
                    const newOtp = otp.split('');
                    newOtp[index] = value;
                    setOtp(newOtp.join(''));
                  }
                }}
                className="w-12 h-12 border-2 border-gray-300 rounded-lg text-center text-xl font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isVerifying || isExpired}
                aria-label={`OTP digit ${index + 1}`}
                title={`Enter digit ${index + 1} of the OTP`}
              />
            ))}
          </div>
        </div>

        <button
          onClick={verifyOTP}
          disabled={otp.length !== 4 || isVerifying || isExpired}
          className="w-full flex items-center justify-center space-x-2 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
      </div>

      {/* Instructions */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600 text-center">
          Ask the customer to show you their OTP and enter it above to verify the order.
        </p>
      </div>
    </div>
  );
};

export default OTPVerificationPanel;
