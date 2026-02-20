import type { VercelRequest, VercelResponse } from '@vercel/node';
import { allowCors, transporter } from './_utils';

const handler = async (req: VercelRequest, res: VercelResponse) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email, orderId, pdfUrl, customerName } = req.body;

    if (!email || !orderId || !pdfUrl) {
        return res.status(400).json({ error: 'Missing required fields: email, orderId, pdfUrl' });
    }

    const name = customerName || 'Customer';

    try {
        const info = await transporter.sendMail({
            from: '"QuickXerox" <invoice@quickxerox.app>', // Sender address
            to: email, // List of receivers
            subject: `Invoice for Order #${orderId} - QuickXerox`, // Subject line
            text: `Hi ${name},\n\nThank you for your order with QuickXerox.\n\nYou can download your invoice for Order #${orderId} here:\n${pdfUrl}\n\nRegards,\nQuickXerox Team`, // plain text body
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
                    <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #e5e7eb; margin-bottom: 20px;">
                        <!-- Using custom logo hosted on Supabase -->
                        <img src="https://tkwazltvxdztaunerksd.supabase.co/storage/v1/object/public/assets/Background-Removed.png" alt="QuickXerox Logo" style="max-height: 80px; width: auto;" />
                    </div>
                    <h2 style="color: #2563EB; font-size: 20px; margin-top: 0;">Thank you for your order!</h2>
                    <p style="color: #374151; font-size: 16px;">Hi ${name},</p>
                    <p style="color: #374151; font-size: 16px; line-height: 1.5;">Your order <strong>#${orderId}</strong> has been successfully processed.</p>
                    <p style="color: #374151; font-size: 16px; margin-bottom: 30px;">You can download your invoice by clicking the button below:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${pdfUrl}" style="background-color: #2563EB; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">Download Invoice</a>
                    </div>

                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="color: #666; font-size: 12px;">This is an automated message from QuickXerox. Please do not reply to this email.</p>
                </div>
            `, // html body
        });

        console.log('Message sent: %s', info.messageId);
        return res.status(200).json({ success: true, messageId: info.messageId });
    } catch (error: any) {
        console.error('Error sending email:', error);
        return res.status(500).json({ error: 'Failed to send email', details: error.message });
    }
};

export default allowCors(handler);
