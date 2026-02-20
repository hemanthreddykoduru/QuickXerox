import type { VercelRequest, VercelResponse } from '@vercel/node';
import { allowCors, transporter, adminDb } from './_utils';

const handler = async (req: VercelRequest, res: VercelResponse) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { email, shopName, invitationLink } = req.body;

    if (!email || !shopName || !invitationLink) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    let subject = 'Invitation to join QuickXerox as a Print Shop Partner';
    let htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
            <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #e5e7eb; margin-bottom: 20px;">
                <img src="https://tkwazltvxdztaunerksd.supabase.co/storage/v1/object/public/assets/Background-Removed.png" alt="QuickXerox Logo" style="max-height: 80px; width: auto;" />
            </div>
            <h2 style="color: #2563EB; font-size: 20px; margin-top: 0;">You're Invited!</h2>
            <p style="color: #374151; font-size: 16px;">Hi <strong>{{shop_name}}</strong>,</p>
            <p style="color: #374151; font-size: 16px; line-height: 1.5;">You've been invited to join QuickXerox as a print shop partner! We're building a platform to connect customers with local print shops, and we'd love to have you on board.</p>
            <p style="color: #374151; font-size: 16px; margin-bottom: 30px;">Click the button below to register your shop and get started:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{invitation_link}}" style="background-color: #2563EB; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">Accept Invitation</a>
            </div>
            <p style="color: #666; font-size: 14px; margin-top: 20px;">Or copy and paste this link into your browser:</p>
            <p style="color: #2563EB; font-size: 12px; word-break: break-all; margin-bottom: 30px;">{{invitation_link}}</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">This invitation was sent by QuickXerox Admin. If you have any questions, please contact support at <a href="mailto:help-contact@quickxerox.app" style="color: #2563EB; text-decoration: none;">help-contact@quickxerox.app</a>.</p>
        </div>
    `;

    try {
        const settingsDoc = await adminDb.collection('systemSettings').doc('general').get();
        if (settingsDoc.exists) {
            const data = settingsDoc.data();
            if (data?.emailTemplates?.SELLER_INVITE) {
                subject = data.emailTemplates.SELLER_INVITE.subject || subject;
                htmlBody = data.emailTemplates.SELLER_INVITE.body || htmlBody;
            }
        }
    } catch (e) {
        console.error('Error fetching email template from Firestore:', e);
    }

    subject = subject.replace(/{{shop_name}}/g, shopName);
    htmlBody = htmlBody
        .replace(/{{shop_name}}/g, shopName)
        .replace(/{{invitation_link}}/g, invitationLink);

    try {
        const info = await transporter.sendMail({
            from: '"QuickXerox" <invitation@quickxerox.app>', // Invitation sender address
            to: email, // List of receivers
            subject: subject, // Subject line
            text: `Hi ${shopName},\n\nYou're invited to join QuickXerox as a print shop partner! We're building a platform to connect customers with local print shops, and we'd love to have you on board.\n\nClick the link below to get started:\n${invitationLink}\n\nThanks,\nQuickXerox Admin\n\nFor support, contact us at help-contact@quickxerox.app`, // plain text body
            html: htmlBody,
        });

        console.log('Invitation email sent: %s', info.messageId);
        return res.status(200).json({ success: true, messageId: info.messageId });
    } catch (error) {
        console.error('Error sending invitation email:', error);
        return res.status(500).json({ error: 'Failed to send invitation email' });
    }
};

export default allowCors(handler);
