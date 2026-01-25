import { useState, useCallback } from 'react';
import { OTP_CONFIG } from '../config/constants';

export const useOTPInput = () => {
  const [otp, setOtp] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  const handleOTPChange = useCallback((value: string) => {
    setOtp(value);
    setIsComplete(value.length === OTP_CONFIG.LENGTH);
  }, []);

  const clearOTP = useCallback(() => {
    setOtp('');
    setIsComplete(false);
  }, []);

  return {
    otp,
    isComplete,
    handleOTPChange,
    clearOTP
  };
};