import type { VercelRequest, VercelResponse } from '@vercel/node';
import { allowCors, transporter } from './_utils';

const handler = async (req: VercelRequest, res: VercelResponse) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email, subject, body } = req.body;

    if (!email || !subject || !body) {
        return res.status(400).json({ error: 'Missing required fields: email, subject, body' });
    }

    try {
        const info = await transporter.sendMail({
            from: '"QuickXerox" <invoice@quickxerox.app>',
            to: email,
            subject: `[TEST] ${subject}`,
            html: body,
            text: 'This is a test email from QuickXerox Admin.',
        });

        console.log('Test email sent:', info.messageId);
        return res.status(200).json({ success: true, messageId: info.messageId });
    } catch (error: any) {
        console.error('Error sending test email:', error);
        return res.status(500).json({ error: 'Failed to send test email', details: error.message });
    }
};

export default allowCors(handler);
