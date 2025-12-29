export const CASHFREE_APP_ID = import.meta.env.VITE_CASHFREE_APP_ID;
export const CASHFREE_SECRET_KEY = import.meta.env.VITE_CASHFREE_SECRET_KEY;

export const PAYMENT_METHODS = [
  {
    id: 'upi',
    name: 'UPI Apps',
    icon: 'Smartphone',
    description: 'Pay using Google Pay, PhonePe, or other UPI apps',
  },
  {
    id: 'card',
    name: 'Credit/Debit Card',
    icon: 'CreditCard',
    description: 'Pay using credit or debit card',
  },
  {
    id: 'netbanking',
    name: 'Net Banking',
    icon: 'Bank',
    description: 'Pay using net banking',
  },
  {
    id: 'wallet',
    name: 'Digital Wallet',
    icon: 'Wallet',
    description: 'Pay using digital wallets',
  },
] as const;

// src/config/constants.ts

export const OTP_CONFIG = {
  MOBILE_REGEX: /^[6-9]\d{9}$/, // Matches valid 10-digit Indian mobile numbers starting with 6-9
  OTP_LENGTH: 6,               // Length of OTP
  EXPIRY: 300,                 // OTP expiry in seconds
  MAX_ATTEMPTS: 3              // Maximum number of OTP verification attempts
};

