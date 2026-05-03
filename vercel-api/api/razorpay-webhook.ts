import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';
import { adminDb } from './_utils';
import crypto from 'crypto';

const handler = async (req: VercelRequest, res: VercelResponse) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
    const signature = req.headers['x-razorpay-signature'] as string;

    if (!signature) {
        return res.status(400).json({ error: 'Missing signature' });
    }

    // Verify signature
    const shasum = crypto.createHmac('sha256', secret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest('hex');

    if (digest !== signature) {
        console.error('Invalid signature');
        return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = req.body;
    console.log('Razorpay Webhook Event:', event.event);

    try {
        if (event.event === 'order.paid' || event.event === 'payment.captured') {
            const razorpayOrderId = event.payload.order?.entity?.id || event.payload.payment?.entity?.order_id;
            const paymentId = event.payload.payment.entity.id;

            if (!razorpayOrderId) {
                console.error('No Order ID found in event');
                return res.status(200).json({ status: 'ok', message: 'No Order ID' });
            }

            // Update order in Firestore
            const orderRef = adminDb.collection('orders').doc(razorpayOrderId);
            const orderDoc = await orderRef.get();

            if (orderDoc.exists) {
                const orderData = orderDoc.data();
                
                // If already paid, skip to avoid duplicate fulfillment
                if (orderData?.isPaid) {
                    console.log(`Order ${razorpayOrderId} already fulfilled`);
                    return res.status(200).json({ status: 'ok' });
                }

                // Generate a 4-digit OTP for the order
                const otp = Math.floor(1000 + Math.random() * 9000).toString();

                await orderRef.update({
                    status: 'pending',
                    isPaid: true,
                    paymentId: paymentId,
                    paidAt: new Date().toISOString(),
                    otp: otp,
                    otpGeneratedAt: new Date().toISOString(),
                    otpVerified: false
                });

                console.log(`Order ${razorpayOrderId} fulfilled successfully`);

                // Record coupon usage if applicable
                if (orderData?.couponId) {
                    const couponRef = adminDb.collection('coupons').doc(orderData.couponId);
                    await adminDb.runTransaction(async (transaction) => {
                        const couponDoc = await transaction.get(couponRef);
                        if (couponDoc.exists) {
                            transaction.update(couponRef, {
                                usedCount: admin.firestore.FieldValue.increment(1),
                                totalDiscountGiven: admin.firestore.FieldValue.increment(orderData.discount || 0)
                            });
                        }
                    });

                    // Record usage
                    const usageRef = adminDb.collection('couponUsage').doc();
                    await usageRef.set({
                        couponId: orderData.couponId,
                        couponCode: orderData.couponCode,
                        orderId: razorpayOrderId,
                        userId: orderData.customerId || 'guest',
                        discountAmount: orderData.discount || 0,
                        usedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
            } else {
                console.warn(`Order ${razorpayOrderId} not found in Firestore for fulfillment`);
            }
        }

        return res.status(200).json({ status: 'ok' });
    } catch (error: any) {
        console.error('Error handling Razorpay webhook:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

export default handler;
