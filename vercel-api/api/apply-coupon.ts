import type { VercelRequest, VercelResponse } from '@vercel/node';
import { allowCors, validateCoupon } from './_utils';

const handler = async (req: VercelRequest, res: VercelResponse) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { couponCode, orderAmount, userId } = req.body;

    if (!couponCode || !orderAmount) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const result = await validateCoupon(couponCode, orderAmount, userId);

        return res.status(200).json({
            success: true,
            ...result
        });
    } catch (error: any) {
        console.error('Error applying coupon:', error);
        return res.status(400).json({
            error: error.message || 'Failed to apply coupon',
            details: error.message
        });
    }
};

export default allowCors(handler);
