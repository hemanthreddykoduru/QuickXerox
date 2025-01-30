import { toast } from 'react-hot-toast';

// Simulated OTP storage (in a real app, this would be handled by a backend)
const otpStore = new Map<string, string>();

export const generateOTP = (mobile: string): string => {
  // Generate a 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(mobile, otp);
  
  // In a real app, this would send the OTP via SMS
  console.log(`OTP for ${mobile}: ${otp}`);
  toast.success('OTP sent successfully! Check console for the OTP.');
  
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