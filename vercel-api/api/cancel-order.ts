import type { VercelRequest, VercelResponse } from '@vercel/node';
import { adminDb, allowCors } from './_utils';

const handler = async (req: VercelRequest, res: VercelResponse) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { orderId } = req.body;

    if (!orderId) {
        return res.status(400).json({ error: 'Missing orderId' });
    }

    try {
        const orderRef = adminDb.collection('orders').doc(orderId);
        const orderDoc = await orderRef.get();

        if (!orderDoc.exists) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const orderData = orderDoc.data();

        // Only allow cancelling if it's still in 'created' status
        if (orderData?.status !== 'created') {
            return res.status(400).json({ 
                error: 'Order cannot be cancelled', 
                currentStatus: orderData?.status 
            });
        }

        await orderRef.update({
            status: 'cancelled',
            paymentId: 'Cancelled by user',
            updatedAt: new Date().toISOString()
        });

        console.log(`Order ${orderId} successfully cancelled via API`);

        return res.status(200).json({
            success: true,
            message: 'Order cancelled successfully'
        });

    } catch (error: any) {
        console.error('Error cancelling order:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

export default allowCors(handler);
