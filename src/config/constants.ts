export const RAZORPAY_KEY = 'rzp_test_YOUR_KEY_HERE';

export const PAYMENT_METHODS = [
  {
    id: 'upi',
    name: 'UPI Apps',
    icon: 'Smartphone',
    description: 'Pay using Google Pay, PhonePe, or other UPI apps',
  },
  {
    id: 'qr',
    name: 'Scan QR Code',
    icon: 'QrCode',
    description: 'Scan QR code with any UPI app',
  },
] as const;

// src/config/constants.ts

export const OTP_CONFIG = {
  MOBILE_REGEX: /^[6-9]\d{9}$/, // Matches valid 10-digit Indian mobile numbers starting with 6-9
  OTP_LENGTH: 6,               // Length of OTP
  OTP_EXPIRY: 300,             // OTP expiry in seconds
};

