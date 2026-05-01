import type { VercelRequest, VercelResponse } from '@vercel/node';
import { allowCors, adminDb } from './_utils';
import * as admin from 'firebase-admin';

const handler = async (req: VercelRequest, res: VercelResponse) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { couponId, orderId, userId, discountAmount } = req.body;

    if (!couponId || !orderId) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const couponRef = adminDb.collection('coupons').doc(couponId);
        
        await adminDb.runTransaction(async (transaction) => {
            const couponDoc = await transaction.get(couponRef);
            if (!couponDoc.exists) {
                throw new Error("Coupon does not exist!");
            }

            const currentCount = couponDoc.data()?.usedCount || 0;
            const usageLimit = couponDoc.data()?.usageLimit || 0;

            if (currentCount >= usageLimit) {
                throw new Error("Coupon usage limit reached!");
            }

            // Increment used count and total discount
            transaction.update(couponRef, { 
                usedCount: currentCount + 1,
                totalDiscountGiven: admin.firestore.FieldValue.increment(discountAmount || 0)
            });

            // Record usage
            const usageRef = adminDb.collection('couponUsage').doc();
            transaction.set(usageRef, {
                couponId,
                couponCode: couponDoc.data()?.code,
                orderId,
                userId: userId || 'guest',
                discountAmount,
                usedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        });

        return res.status(200).json({ success: true });
    } catch (error: any) {
        console.error('Error recording coupon usage:', error);
        return res.status(500).json({
            error: 'Failed to record coupon usage',
            details: error.message
        });
    }
};

export default allowCors(handler);
