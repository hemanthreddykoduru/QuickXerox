import { toast } from 'react-hot-toast';

// Simulated OTP storage (in a real app, this would be handled by a backend)
const otpStore = new Map<string, string>();

export const generateOTP = (mobile: string): string => {
  // Use crypto.getRandomValues for a cryptographically secure 6-digit OTP
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const otp = ((array[0] % 9000) + 1000).toString();
  otpStore.set(mobile, otp);
  
  // In a real app, this would send the OTP via SMS gateway (Twilio/MSG91)
  // NEVER log OTPs to the console in production
  toast.success('OTP sent successfully!');
  
  return otp;
};

export const verifyOTP = (mobile: string, otp: string): boolean => {
  const storedOTP = otpStore.get(mobile);
  const isValid = storedOTP === otp;
  
  if (isValid) {
    otpStore.delete(mobile); // Clear OTP after successful verification
  }
  
  return isValid;
};