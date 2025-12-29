# Cashfree Payment Gateway Integration

This guide explains how to set up Cashfree payment gateway in your QuickXerox application.

## Setup Instructions

### 1. Cashfree Account Setup

1. Sign up for a Cashfree account at https://www.cashfree.com/
2. Complete the KYC process
3. Get your App ID and Secret Key from the Cashfree dashboard

### 2. Environment Variables

Create a `.env` file in your project root with the following variables:

```env
VITE_CASHFREE_APP_ID=your_cashfree_app_id_here
VITE_CASHFREE_SECRET_KEY=your_cashfree_secret_key_here
```

### 3. Update Configuration

Replace the placeholder values in `src/config/constants.ts`:

```typescript
export const CASHFREE_APP_ID = "your_actual_cashfree_app_id";
export const CASHFREE_SECRET_KEY = "your_actual_cashfree_secret_key";
```

### 4. Backend Integration (Optional)

For production use, you should implement server-side order creation and verification:

1. Create API endpoints for order creation
2. Implement webhook handling for payment verification
3. Update the `createCashfreePayment` function in `src/services/paymentService.ts`

### 5. Testing

- Use Cashfree's sandbox environment for testing
- Test with different payment methods (UPI, Card, Net Banking, Wallet)
- Verify payment success and failure scenarios

### 6. Production Deployment

- Change the mode from "sandbox" to "production" in `src/utils/cashfree.ts`
- Update App ID and Secret Key to production values
- Ensure HTTPS is enabled for production

## Payment Methods Supported

- UPI (Google Pay, PhonePe, etc.)
- Credit/Debit Cards
- Net Banking
- Digital Wallets

## Features

- Secure payment processing
- Multiple payment method support
- Real-time payment status
- Error handling and user feedback
- Responsive design

## Troubleshooting

- Ensure all environment variables are set correctly
- Check browser console for any JavaScript errors
- Verify Cashfree SDK is loading properly
- Test with different browsers and devices
