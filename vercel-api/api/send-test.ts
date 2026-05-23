import type { VercelRequest, VercelResponse } from '@vercel/node';
import { allowCors, transporter } from './_utils';

const handler = async (req: VercelRequest, res: VercelResponse) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email, subject, body } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    try {
        // Support both custom template tests and the generic backend support test
        const emailSubject = subject || 'QuickXerox Test Email';
        const emailHtml = body || `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #2563eb;">QuickXerox Test</h2>
                <p>Hello!</p>
                <p>This is a test email confirming that your <b>Vercel Backend</b> is successfully sending emails using Mailtrap.</p>
                <p>Your setup is working perfectly!</p>
                <br />
                <p>Best regards,<br />QuickXerox Team</p>
            </div>
        `;

        const info = await transporter.sendMail({
            from: '"QuickXerox" <invoice@quickxerox.app>',
            to: email,
            subject: subject ? `[TEST] ${subject}` : emailSubject,
            html: emailHtml,
            text: 'This is a test email from QuickXerox.',
        });

        console.log('Test email sent:', info.messageId);
        return res.status(200).json({ success: true, messageId: info.messageId, message: 'Test email sent successfully' });
    } catch (error: any) {
        console.error('Error sending test email:', error);
        return res.status(500).json({ error: 'Failed to send test email', details: error.message });
    }
};

export default allowCors(handler);
