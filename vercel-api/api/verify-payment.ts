import type { VercelRequest, VercelResponse } from '@vercel/node';
import { allowCors } from './_utils';
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
            return res.status(200).json({ success: true });
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
