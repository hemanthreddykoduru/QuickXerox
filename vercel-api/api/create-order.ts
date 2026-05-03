import type { VercelRequest, VercelResponse } from '@vercel/node';
import { allowCors, razorpay, validateCoupon, calculateOrderAmount, adminDb } from './_utils';

const handler = async (req: VercelRequest, res: VercelResponse) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { shopId, items, currency, receipt, notes, couponCode, userId, customerName, customerEmail, customerPhone } = req.body;

    if (!shopId || !items) {
        return res.status(400).json({ error: 'Missing required fields: shopId and items' });
    }

    try {
        // 1. Securely calculate the base amount server-side
        const calculatedAmount = await calculateOrderAmount(shopId, items);
        
        let finalAmountToCharge = calculatedAmount;
        let discountAmount = 0;
        let appliedCouponId = null;

        // 2. Securely re-validate coupon and calculate final amount server-side before charging
        if (couponCode) {
            const result = await validateCoupon(couponCode, calculatedAmount, userId);
            finalAmountToCharge = result.finalAmount;
            discountAmount = result.discount;
            appliedCouponId = result.couponId;
        }

        // 3. Create the Razorpay order
        const razorpayOrder = await razorpay.orders.create({
            amount: Math.round(finalAmountToCharge * 100), // Razorpay expects amount in paise
            currency: currency || 'INR',
            receipt: receipt || `receipt_${Date.now()}`,
            notes: {
                ...notes,
                shopId,
                calculatedAt: new Date().toISOString()
            },
        });

        // 4. Pre-create the order record in Firestore with "created" status
        // This ensures the order exists even if the webhook fails or is delayed
        const orderId = razorpayOrder.id;
        const orderData = {
            id: orderId,
            customerId: userId || 'guest',
            customerName: customerName || 'Guest',
            customerEmail: customerEmail || '',
            customerPhone: customerPhone || '',
            items: items,
            total: finalAmountToCharge,
            baseAmount: calculatedAmount,
            discount: discountAmount,
            couponCode: couponCode || null,
            couponId: appliedCouponId,
            status: 'created', // Special status before payment is confirmed
            timestamp: new Date().toISOString(),
            shopId: shopId,
            isPaid: false,
            razorpayOrderId: razorpayOrder.id,
            createdAt: new Date().toISOString()
        };

        await adminDb.collection('orders').doc(orderId).set(orderData);

        return res.status(200).json({
            orderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            key_id: process.env.RAZORPAY_KEY_ID,
        });
    } catch (error: any) {
        console.error('Error creating order:', error);
        return res.status(error.message.includes('not found') ? 404 : 500).json({
            error: 'Failed to create order',
            details: error.message
        });
    }
};

export default allowCors(handler);
