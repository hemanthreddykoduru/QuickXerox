import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';
import { allowCors, transporter } from './_utils';

const VERIFICATION_TEMPLATE = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; color: #1f2937;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff">
        <tr>
            <td align="center" bgcolor="#ffffff" style="background-color: #ffffff !important; padding: 24px 20px 20px; border-bottom: 1px solid #e5e7eb;">
                <div style="display: inline-block; background-color: #ffffff; border-radius: 12px; padding: 10px 20px;">
                    <img src="https://tkwazltvxdztaunerksd.supabase.co/storage/v1/object/public/assets/Background-Removed.png" alt="QuickXerox Logo" style="max-height: 60px; width: auto; display: block;" />
                </div>
            </td>
        </tr>
    </table>
    
    <div style="padding: 32px 40px; background-color: #ffffff; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <h2 style="color: #2563EB; font-size: 24px; margin-top: 0; margin-bottom: 24px;">Verify your Email Address</h2>
        <p style="color: #374151; font-size: 16px; margin-bottom: 16px;">Hi <strong>{{name}}</strong>,</p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Welcome to QuickXerox! Please verify your email address to complete your registration and start using our services.</p>
        
        <div style="text-align: center; margin: 32px 0;">
            <a href="{{link}}" style="background-color: #2563EB; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">Verify Email Address</a>
        </div>
        
        <p style="color: #6B7280; font-size: 14px; margin-bottom: 8px;">Or copy and paste this link into your browser:</p>
        <p style="background-color: #F3F4F6; padding: 12px; border-radius: 4px; color: #4B5563; font-size: 13px; word-break: break-all; margin-bottom: 32px; font-family: monospace;">{{link}}</p>
        
        <div style="border-top: 1px solid #E5E7EB; padding-top: 24px;">
            <p style="color: #6B7280; font-size: 14px; margin-bottom: 8px; line-height: 1.5;">If you didn't create an account with QuickXerox, you can safely ignore this email.</p>
            <p style="color: #6B7280; font-size: 14px; margin: 0;">Thanks,<br/>The QuickXerox Team</p>
        </div>
    </div>
    
    <div style="text-align: center; padding: 24px; background-color: #F9FAFB; border-top: 1px solid #E5E7EB;">
        <p style="color: #9CA3AF; font-size: 13px; margin-bottom: 8px;">Need help? Contact our support team at</p>
        <a href="mailto:support@quickxerox.app" style="color: #2563EB; font-size: 13px; text-decoration: none;">support@quickxerox.app</a>
        <p style="color: #9CA3AF; font-size: 12px; margin-top: 16px;">&copy; ${new Date().getFullYear()} QuickXerox. All rights reserved.</p>
    </div>
</div>
`;

const handler = async (req: VercelRequest, res: VercelResponse) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email, name } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Missing required field: email' });
    }

    try {
        // Generate the verification link using Firebase Admin SDK
        const originalLink = await admin.auth().generateEmailVerificationLink(email);

        // Extract oobCode and build custom link pointing to our React frontend
        const urlObj = new URL(originalLink);
        const oobCode = urlObj.searchParams.get('oobCode');
        const customLink = `https://quickxerox.app/verify-email?code=${oobCode}`;

        // Replace placeholders in the HTML template
        const htmlBody = VERIFICATION_TEMPLATE
            .replace('{{name}}', name || 'Customer')
            .replace(/{{link}}/g, customLink);

        // Send the email using Nodemailer
        const info = await transporter.sendMail({
            from: '"QuickXerox" <verification@quickxerox.app>', // Or use a generic sender
            to: email,
            subject: 'Verify your email for QuickXerox',
            html: htmlBody,
            text: `Hi ${name || 'Customer'},\n\nPlease verify your email for QuickXerox: ${customLink}`,
        });

        console.log('Verification email sent:', info.messageId);
        return res.status(200).json({ success: true, messageId: info.messageId });
    } catch (error: any) {
        console.error('Error sending verification email:', error);
        return res.status(500).json({ error: 'Failed to send verification email', details: error.message });
    }
};

export default allowCors(handler);
