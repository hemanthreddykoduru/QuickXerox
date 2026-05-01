import type { VercelRequest, VercelResponse } from '@vercel/node';
import { allowCors, razorpay, validateCoupon } from './_utils';

const handler = async (req: VercelRequest, res: VercelResponse) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { amount, currency, receipt, notes, couponCode, userId } = req.body;

    try {
        let finalAmountToCharge = amount;

        // Securely re-validate coupon and calculate final amount server-side before charging
        if (couponCode) {
            const result = await validateCoupon(couponCode, amount, userId);
            finalAmountToCharge = result.finalAmount;
        }

        const order = await razorpay.orders.create({
            amount: Math.round(finalAmountToCharge * 100), // Razorpay expects amount in paise
            currency: currency || 'INR',
            receipt: receipt || `receipt_${Date.now()}`,
            notes: notes || {},
        });

        return res.status(200).json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            key_id: process.env.RAZORPAY_KEY_ID,
        });
    } catch (error: any) {
        console.error('Error creating Razorpay order:', error);
        return res.status(500).json({
            error: 'Failed to create Razorpay order',
            details: error.message
        });
    }
};

export default allowCors(handler);
