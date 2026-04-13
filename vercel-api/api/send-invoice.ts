import type { VercelRequest, VercelResponse } from '@vercel/node';
import { allowCors, transporter, adminDb } from './_utils';

const handler = async (req: VercelRequest, res: VercelResponse) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email, orderId, pdfUrl, customerName } = req.body;

    if (!email || !orderId || !pdfUrl) {
        return res.status(400).json({ error: 'Missing required fields: email, orderId, pdfUrl' });
    }

    const name = customerName || 'Customer';

    let subject = `Invoice for Order #${orderId} - QuickXerox`;
    let htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; color: #1f2937;">
            <!-- Header: forced white background to prevent dark-mode inversion on mobile -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff">
                <tr>
                    <td align="center" bgcolor="#ffffff" style="background-color: #ffffff !important; padding: 24px 20px 20px; border-bottom: 1px solid #e5e7eb;">
                        <!-- White pill behind logo so it sits cleanly on any background -->
                        <div style="display: inline-block; background-color: #ffffff; border-radius: 12px; padding: 10px 20px;">
                            <img src="https://tkwazltvxdztaunerksd.supabase.co/storage/v1/object/public/assets/Background-Removed.png" alt="QuickXerox Logo" style="max-height: 60px; width: auto; display: block;" />
                        </div>
                    </td>
                </tr>
            </table>
            <!-- Body -->
            <div style="padding: 24px 20px; background-color: #ffffff;">
                <h2 style="color: #2563EB; font-size: 20px; margin-top: 0;">Thank you for your order!</h2>
                <p style="color: #374151; font-size: 16px;">Hi ${name},</p>
                <p style="color: #374151; font-size: 16px; line-height: 1.5;">Your order <strong>#${orderId}</strong> has been successfully processed.</p>
                <p style="color: #374151; font-size: 16px; margin-bottom: 30px;">You can download your invoice by clicking the button below:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${pdfUrl}" style="background-color: #2563EB; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">Download Invoice</a>
                </div>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
                <p style="color: #9ca3af; font-size: 12px; margin-bottom: 8px;">This is an automated message from QuickXerox. Please do not reply to this email.</p>
                <p style="color: #9ca3af; font-size: 12px; margin-top: 0;">If you have any questions, please contact us at <a href="mailto:support@quickxerox.app" style="color: #2563EB; text-decoration: none;">support@quickxerox.app</a>.</p>
            </div>
        </div>
    `;

    try {
        const settingsDoc = await adminDb.collection('systemSettings').doc('general').get();
        if (settingsDoc.exists) {
            const data = settingsDoc.data();
            if (data?.emailTemplates?.ORDER_INVOICE) {
                subject = data.emailTemplates.ORDER_INVOICE.subject || subject;
                htmlBody = data.emailTemplates.ORDER_INVOICE.body || htmlBody;
            }
        }
    } catch (e) {
        console.error('Error fetching email template from Firestore:', e);
    }

    subject = subject.replace(/{{order_id}}/g, orderId);
    htmlBody = htmlBody
        .replace(/{{name}}/g, name)
        .replace(/{{order_id}}/g, orderId)
        .replace(/{{pdf_url}}/g, pdfUrl);

    try {
        const info = await transporter.sendMail({
            from: '"QuickXerox" <invoice@quickxerox.app>', // Sender address
            to: email, // List of receivers
            subject: subject, // Subject line
            text: `Hi ${name},\n\nThank you for your order with QuickXerox.\n\nYou can download your invoice for Order #${orderId} here:\n${pdfUrl}\n\nRegards,\nQuickXerox Team`, // plain text body
            html: htmlBody, // html body
        });

        console.log('Message sent: %s', info.messageId);
        return res.status(200).json({ success: true, messageId: info.messageId });
    } catch (error: any) {
        console.error('Error sending email:', error);
        return res.status(500).json({ error: 'Failed to send email', details: error.message });
    }
};

export default allowCors(handler);
