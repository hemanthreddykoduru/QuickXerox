# EmailJS Setup Guide for QuickXerox

## What is EmailJS?
EmailJS is a free service that lets you send emails directly from your frontend without needing a backend server or Cloud Functions.

**Free Tier**: 200 emails/month (perfect for seller invitations!)

## Setup Steps

### 1. Create EmailJS Account
1. Go to https://www.emailjs.com/
2. Click **"Sign Up"** (top right)
3. Create a free account

### 2. Connect Your Email Service
1. After logging in, go to **"Email Services"** in the left sidebar
2. Click **"Add New Service"**
3. Choose **"Gmail"** (or your preferred email provider)
4. Click **"Connect Account"** and authorize EmailJS
5. Copy your **Service ID** (you'll need this later)

### 3. Create an Email Template
1. Go to **"Email Templates"** in the left sidebar
2. Click **"Create New Template"**
3. **Template Name**: "Seller Invitation"
4. **Template Content**:

```html
Subject: You've been invited to join QuickXerox as {{shop_name}}

Body:
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #3B82F6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #3B82F6; color: white !important; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Welcome to QuickXerox!</h1>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p>You've been invited to join QuickXerox as a seller for <strong>{{shop_name}}</strong>.</p>
      <p>Click the button below to accept your invitation and set up your account:</p>
      <div style="text-align: center;">
        <a href="{{invitation_link}}" class="button">
          Accept Invitation
        </a>
      </div>
      <p><strong>Important:</strong> This invitation will expire in 7 days.</p>
      <p>If you didn't expect this invitation, please ignore this email.</p>
    </div>
    <div class="footer">
      <p>© 2026 QuickXerox. All rights reserved.</p>
      <p>Sent by {{from_name}}</p>
    </div>
  </div>
</body>
</html>
```

5. **Template Settings**:
   - To: `{{to_email}}`
   - From: Your email
   - Reply To: Your email

6. Click **"Save"**
7. Copy your **Template ID** (you'll need this later)

### 4. Get Your Public Key
1. Go to **"Account"** in the left sidebar
2. Scroll to **"API Keys"** section
3. Copy your **Public Key**

### 5. Update the Code

Open `/src/components/SellerInvitation.tsx` and replace these placeholders:

```typescript
await emailjs.send(
  'YOUR_SERVICE_ID',      // Replace with Service ID from step 2
  'YOUR_TEMPLATE_ID',     // Replace with Template ID from step 3
  templateParams,
  'YOUR_PUBLIC_KEY'       // Replace with Public Key from step 4
);
```

**Example:**
```typescript
await emailjs.send(
  'service_abc1234',
  'template_xyz5678',
  templateParams,
  'vR5_X-9kL3mN2pQ'
);
```

### 6. Test It!

1. Build and deploy your app:
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

2. Go to your admin dashboard
3. Click "Invite New Seller"
4. Fill in an email and shop name
5. Click "Send Invitation"
6. Check the recipient's email inbox (and spam folder!)

## Important Notes

- ✅ **Free**: 200 emails/month
- ✅ **No Cloud Functions needed**: Works with Firebase Spark (free) plan
- ✅ **No backend required**: All from frontend
- ⚠️ **Public keys are safe**: EmailJS public keys are meant to be in frontend code
- ⚠️ **Rate limits**: Don't spam - stay within 200 emails/month

## Troubleshooting

**Email not received?**
1. Check spam folder
2. Verify email address in EmailJS dashboard
3. Check EmailJS usage dashboard for errors
4. Check browser console for errors

**Template not working?**
1. Make sure all `{{variables}}` match the templateParams in code
2. Test the template in EmailJS dashboard ("Test Email" button)

**Still having issues?**
- Check EmailJS documentation: https://www.emailjs.com/docs/
- Check the browser console for error messages
- Verify your Service ID, Template ID, and Public Key are correct

## Security Note
Your MailTrap credentials are no longer needed since we're using EmailJS instead! EmailJS handles the SMTP connection for you.
