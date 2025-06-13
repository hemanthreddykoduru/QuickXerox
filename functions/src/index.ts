import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';
import Razorpay from 'razorpay';

admin.initializeApp();

// Configure nodemailer with your email service
const transporter = nodemailer.createTransport({
  service: 'gmail',  // or your preferred email service
  auth: {
    user: functions.config().email.user,
    pass: functions.config().email.pass
  }
});

// Initialize Razorpay with environment variables
const razorpay = new Razorpay({
  key_id: functions.config().razorpay.key_id,
  key_secret: functions.config().razorpay.key_secret,
});

export const sendSellerInvitation = functions.firestore
  .document('sellerInvitations/{invitationId}')
  .onCreate(async (snap: admin.firestore.DocumentSnapshot, context) => {
    const invitation = snap.data() as { email: string; shopName: string; };
    const invitationId = context.params.invitationId;

    const mailOptions = {
      from: 'QuickXerox <noreply@quickxerox.com>',
      to: invitation.email,
      subject: `You've been invited to join QuickXerox as ${invitation.shopName}`,
      html: `
        <h1>Welcome to QuickXerox!</h1>
        <p>You've been invited to join QuickXerox as a seller for ${invitation.shopName}.</p>
        <p>Click the link below to set up your account:</p>
        <a href="${functions.config().app.url}/seller-invitation?id=${invitationId}" 
           style="display: inline-block; padding: 12px 24px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 4px;">
          Accept Invitation
        </a>
        <p>This invitation will expire in 7 days.</p>
        <p>If you didn't expect this invitation, please ignore this email.</p>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log('Invitation email sent successfully');
    } catch (error) {
      console.error('Error sending invitation email:', error);
      throw new functions.https.HttpsError('internal', 'Failed to send invitation email');
    }
  });

interface CreateOrderData {
  amount: number;
  currency: string;
  receipt: string;
  notes: { [key: string]: string };
}

export const createRazorpayOrder = functions.https.onCall(async (request: functions.https.CallableRequest<CreateOrderData>) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const { amount, currency, receipt, notes } = request.data;

  try {
    const order = await razorpay.orders.create({
      amount: amount * 100, // Razorpay expects amount in paise
      currency,
      receipt,
      notes,
    });
    return { orderId: order.id, amount: order.amount, currency: order.currency, key_id: functions.config().razorpay.key_id };
  } catch (error: any) {
    console.error('Error creating Razorpay order:', error);
    throw new functions.https.HttpsError('internal', 'Failed to create Razorpay order', error.message);
  }
});

interface VerifyPaymentData {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export const verifyRazorpayPayment = functions.https.onCall(async (request: functions.https.CallableRequest<VerifyPaymentData>) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = request.data;

  try {
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = Razorpay.validateWebhookSignature(body, razorpay_signature, functions.config().razorpay.key_secret);
    
    if (expectedSignature) {
      return { success: true };
    } else {
      throw new functions.https.HttpsError('invalid-argument', 'Signature verification failed');
    }
  } catch (error: any) {
    console.error('Error verifying Razorpay payment:', error);
    throw new functions.https.HttpsError('internal', 'Payment verification failed', error.message);
  }
}); 