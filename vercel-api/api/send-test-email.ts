import type { VercelRequest, VercelResponse } from '@vercel/node';
import { allowCors, transporter } from './_utils';

const handler = async (req: VercelRequest, res: VercelResponse) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    try {
        await transporter.sendMail({
            from: '"QuickXerox Support" <support@quickxerox.com>',
            to: email,
            subject: 'QuickXerox Test Email',
            text: 'This is a test email from your QuickXerox Vercel Backend.',
            html: `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #2563eb;">QuickXerox Test</h2>
                    <p>Hello!</p>
                    <p>This is a test email confirming that your <b>Vercel Backend</b> is successfully sending emails using Mailtrap.</p>
                    <p>Your setup is working perfectly!</p>
                    <br />
                    <p>Best regards,<br />QuickXerox Team</p>
                </div>
            `,
        });

        return res.status(200).json({ success: true, message: 'Test email sent successfully' });
    } catch (error: any) {
        console.error('Error sending test email:', error);
        return res.status(500).json({ error: 'Failed to send test email', details: error.message });
    }
};

export default allowCors(handler);
