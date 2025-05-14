import { toast } from 'react-hot-toast';
import { OTP_CONFIG } from '../config/constants';

interface AuthState {
  otpMap: Map<string, { otp: string; expiresAt: number }>;
  attempts: Map<string, number>;
}

const state: AuthState = {
  otpMap: new Map(),
  attempts: new Map()
};

export const generateOTP = (mobile: string): string => {
  const otp = "123456"; // Fixed OTP for testing
  const expiresAt = Date.now() + OTP_CONFIG.EXPIRY * 1000; // Convert expiry time to milliseconds

  // Reset attempts and store new OTP with expiry
  state.attempts.set(mobile, 0);
  state.otpMap.set(mobile, { otp, expiresAt });

  // Simulate sending OTP (console log for testing)
  console.log('Generated OTP:', otp);

  return otp;
};

export const verifyOTP = (mobile: string, inputOTP: string): boolean => {
  const storedData = state.otpMap.get(mobile);
  const currentAttempts = state.attempts.get(mobile) || 0;
  
  if (currentAttempts >= OTP_CONFIG.MAX_ATTEMPTS) {
    toast.error('Too many attempts. Please request a new code.');
    return false;
  }
  
  if (!storedData || Date.now() > storedData.expiresAt) {
    toast.error('Verification code has expired. Please request a new one.');
    state.otpMap.delete(mobile);
    return false;
  }
  
  if (storedData.otp === inputOTP) {
    // Clean up after successful verification
    state.otpMap.delete(mobile);
    state.attempts.delete(mobile);
    return true;
  }
  
  // Increment attempts and show remaining attempts
  const remainingAttempts = OTP_CONFIG.MAX_ATTEMPTS - (currentAttempts + 1);
  state.attempts.set(mobile, currentAttempts + 1);
  toast.error(`Invalid code. ${remainingAttempts} attempts remaining.`);
  
  return false;
};