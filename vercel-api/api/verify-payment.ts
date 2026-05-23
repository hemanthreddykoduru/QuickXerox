import type { VercelRequest, VercelResponse } from '@vercel/node';
import { allowCors, adminDb } from './_utils';
import Razorpay from 'razorpay';

const handler = async (req: VercelRequest, res: VercelResponse) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const secret = process.env.RAZORPAY_KEY_SECRET || '';

    try {
        const body = razorpay_order_id + '|' + razorpay_payment_id;

        // Check signature
        const expectedSignature = Razorpay.validateWebhookSignature(body, razorpay_signature, secret);

        if (expectedSignature) {
            // Fulfill order in Firestore synchronously
            const orderRef = adminDb.collection('orders').doc(razorpay_order_id);
            const orderDoc = await orderRef.get();
            let otp = '';

            if (orderDoc.exists) {
                const orderData = orderDoc.data();
                if (orderData?.isPaid) {
                    otp = orderData.otp || '';
                } else {
                    // Generate a 4-digit OTP
                    otp = Math.floor(1000 + Math.random() * 9000).toString();
                    await orderRef.update({
                        status: 'pending',
                        isPaid: true,
                        paymentId: razorpay_payment_id,
                        paidAt: new Date().toISOString(),
                        otp: otp,
                        otpGeneratedAt: new Date().toISOString(),
                        otpVerified: false
                    });
                    console.log(`Order ${razorpay_order_id} synchronously fulfilled via verifyPayment`);
                }
            } else {
                console.warn(`Order ${razorpay_order_id} not found in Firestore during verification`);
            }

            return res.status(200).json({ success: true, otp });
        } else {
            return res.status(400).json({ success: false, error: 'Signature verification failed' });
        }
    } catch (error: any) {
        console.error('Error verifying Razorpay payment:', error);
        return res.status(500).json({
            error: 'Payment verification failed',
            details: error.message
        });
    }
};

export default allowCors(handler);
