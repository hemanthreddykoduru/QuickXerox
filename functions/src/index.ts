import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';
import Razorpay from 'razorpay';
import cors from 'cors';
import * as crypto from 'crypto';


admin.initializeApp();

// Configure nodemailer with MailTrap SMTP
const transporter = nodemailer.createTransport({
  host: 'sandbox.smtp.mailtrap.io',
  port: 587,
  secure: false, // use STARTTLS
  auth: {
    user: '7eb48d5db8bdd2',
    pass: '20e0c928132dd6'
  }
});

// Initialize Razorpay with Test Keys (Provided by User)
// TODO: For production, move these to functions.config()
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'your_key_id';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'your_key_secret';
const RAZORPAY_WEBHOOK_SECRET = 'your_webhook_secret_here'; // Get this from Razorpay Dashboard

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

const corsHandler = cors({ origin: true });

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
              <p>You've been invited to join QuickXerox as a seller for <strong>${invitation.shopName}</strong>.</p>
              <p>Click the button below to accept your invitation and set up your account:</p>
              <div style="text-align: center;">
                <a href="https://otp-project-aafc6.web.app/seller-invitation?id=${invitationId}" class="button">
                  Accept Invitation
                </a>
              </div>
              <p><strong>Important:</strong> This invitation will expire in 7 days.</p>
              <p>If you didn't expect this invitation, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>© 2026 QuickXerox. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
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

export const createRazorpayOrder = functions.https.onCall(async (data: CreateOrderData, context: functions.https.CallableContext) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const { amount, currency, receipt, notes } = data;

  try {
    const order = await razorpay.orders.create({
      amount: amount * 100, // Razorpay expects amount in paise
      currency,
      receipt,
      notes,
    });
    return { orderId: order.id, amount: order.amount, currency: order.currency, key_id: RAZORPAY_KEY_ID };
  } catch (error: any) {
    console.error('Error creating Razorpay order:', error);
    throw new functions.https.HttpsError('internal', 'Failed to create Razorpay order', error.message);
  }
});

// HTTP endpoint for Razorpay order creation with CORS
export const createRazorpayOrderHttp = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }
    try {
      const { amount, currency, receipt, notes } = req.body;
      const order = await razorpay.orders.create({
        amount: amount * 100, // Razorpay expects amount in paise
        currency,
        receipt,
        notes,
      });
      return res.status(200).send({ orderId: order.id, amount: order.amount, currency: order.currency, key_id: RAZORPAY_KEY_ID });
    } catch (error: any) {
      console.error('Error creating Razorpay order:', error);
      return res.status(500).send({ error: 'Failed to create Razorpay order', details: error.message });
    }
  });
});

interface VerifyPaymentData {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export const verifyRazorpayPayment = functions.https.onCall(async (data: VerifyPaymentData, context: functions.https.CallableContext) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = data;

  try {
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = Razorpay.validateWebhookSignature(body, razorpay_signature, RAZORPAY_KEY_SECRET);

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

// ============================================
// WEBHOOK HANDLER FOR RAZORPAY PAYMENTS
// ============================================

/**
 * Razorpay Webhook Handler
 * Receives payment events from Razorpay and processes them
 * Events: payment.authorized, payment.failed, order.paid, etc.
 */
export const razorpayWebhook = functions.https.onRequest(async (req, res) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    console.warn('Webhook rejected: Invalid method', req.method);
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    // Get webhook signature from headers
    const webhookSignature = req.headers['x-razorpay-signature'] as string;

    if (!webhookSignature) {
      console.error('Webhook rejected: Missing signature');
      res.status(401).send('Missing webhook signature');
      return;
    }

    // Verify webhook signature
    const webhookBody = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
      .update(webhookBody)
      .digest('hex');

    if (webhookSignature !== expectedSignature) {
      console.error('Webhook rejected: Invalid signature');
      res.status(401).send('Invalid webhook signature');
      return;
    }

    // Parse webhook event
    const event = req.body.event;
    const payload = req.body.payload;

    console.log('✅ Webhook verified:', event);

    // Handle different webhook events
    switch (event) {
      case 'payment.authorized':
      case 'order.paid':
        await handlePaymentSuccess(payload);
        break;

      case 'payment.failed':
        await handlePaymentFailure(payload);
        break;

      case 'payment.captured':
        console.log('Payment captured:', payload.payment.entity.id);
        // Additional logging, no action needed (already handled in authorized)
        break;

      default:
        console.log('Unhandled webhook event:', event);
    }

    // Log webhook to audit logs
    await admin.firestore().collection('auditLogs').add({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      adminEmail: 'system@quickxerox.com',
      action: `Webhook: ${event}`,
      details: `Payment ID: ${payload.payment?.entity?.id || 'N/A'}`,
    });

    res.status(200).send('Webhook processed successfully');
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    res.status(500).send('Internal server error');
  }
});

/**
 * Handle successful payment
 * Updates order status and sends notifications
 */
async function handlePaymentSuccess(payload: any) {
  try {
    const payment = payload.payment.entity;
    const razorpayOrderId = payment.order_id;
    const paymentId = payment.id;
    const amount = payment.amount / 100; // Convert paise to rupees

    console.log('Processing payment success:', paymentId);

    // Find order in Firestore by razorpayOrderId
    const ordersRef = admin.firestore().collection('orders');
    const querySnapshot = await ordersRef.where('razorpayOrderId', '==', razorpayOrderId).get();

    if (querySnapshot.empty) {
      console.error('Order not found for Razorpay Order ID:', razorpayOrderId);
      return;
    }

    const orderDoc = querySnapshot.docs[0];
    const order = orderDoc.data();

    // Update order with payment details
    await orderDoc.ref.update({
      status: 'processing',
      paymentStatus: 'paid',
      paymentId: paymentId,
      paymentMethod: payment.method,
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('✅ Order updated successfully:', orderDoc.id);

    // Send confirmation email to customer
    try {
      await sendPaymentSuccessEmail(order.customerEmail, order.customerName, orderDoc.id, amount);
    } catch (emailError) {
      console.error('Failed to send customer email:', emailError);
      // Don't fail the webhook if email fails
    }

    // Send notification to seller
    try {
      const sellerDoc = await admin.firestore().collection('shopOwners').doc(order.shopId).get();
      if (sellerDoc.exists) {
        const sellerData = sellerDoc.data();
        await sendNewOrderNotificationToSeller(sellerData?.email, order.customerName, orderDoc.id);
      }
    } catch (emailError) {
      console.error('Failed to send seller email:', emailError);
    }

  } catch (error) {
    console.error('Error handling payment success:', error);
    throw error;
  }
}

/**
 * Handle failed payment
 * Updates order status and sends notification
 */
async function handlePaymentFailure(payload: any) {
  try {
    const payment = payload.payment.entity;
    const razorpayOrderId = payment.order_id;
    const paymentId = payment.id;
    const errorReason = payment.error_reason || 'Unknown error';

    console.log('Processing payment failure:', paymentId);

    // Find order in Firestore
    const ordersRef = admin.firestore().collection('orders');
    const querySnapshot = await ordersRef.where('razorpayOrderId', '==', razorpayOrderId).get();

    if (querySnapshot.empty) {
      console.error('Order not found for Razorpay Order ID:', razorpayOrderId);
      return;
    }

    const orderDoc = querySnapshot.docs[0];
    const order = orderDoc.data();

    // Update order with failure details
    await orderDoc.ref.update({
      paymentStatus: 'failed',
      paymentFailureReason: errorReason,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('✅ Order marked as payment failed:', orderDoc.id);

    // Send failure notification to customer
    try {
      await sendPaymentFailureEmail(order.customerEmail, order.customerName, orderDoc.id, errorReason);
    } catch (emailError) {
      console.error('Failed to send failure email:', emailError);
    }

  } catch (error) {
    console.error('Error handling payment failure:', error);
    throw error;
  }
}

/**
 * Send payment success email to customer
 */
async function sendPaymentSuccessEmail(email: string, name: string, orderId: string, amount: number) {
  const mailOptions = {
    from: 'QuickXerox <noreply@quickxerox.com>',
    to: email,
    subject: '✅ Payment Successful - Your Order is Confirmed!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #10B981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .info-box { background: white; padding: 15px; border-left: 4px solid #10B981; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">✅ Payment Successful!</h1>
          </div>
          <div class="content">
            <p>Hi ${name},</p>
            <p>Your payment has been successfully processed! Your order is now confirmed and being prepared.</p>
            <div class="info-box">
              <p><strong>Order ID:</strong> ${orderId}</p>
              <p><strong>Amount Paid:</strong> ₹${amount.toFixed(2)}</p>
              <p><strong>Status:</strong> Processing</p>
            </div>
            <p>We'll notify you once your order is ready for pickup.</p>
            <p>Thank you for using QuickXerox!</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  await transporter.sendMail(mailOptions);
  console.log('Payment success email sent to:', email);
}

/**
 * Send payment failure email to customer
 */
async function sendPaymentFailureEmail(email: string, name: string, orderId: string, reason: string) {
  const mailOptions = {
    from: 'QuickXerox <noreply@quickxerox.com>',
    to: email,
    subject: '❌ Payment Failed - Please Try Again',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #EF4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">❌ Payment Failed</h1>
          </div>
          <div class="content">
            <p>Hi ${name},</p>
            <p>We weren't able to process your payment for order <strong>${orderId}</strong>.</p>
            <p><strong>Reason:</strong> ${reason}</p>
            <p>Please try placing your order again. If the problem persists, contact your bank or try a different payment method.</p>
            <p>We're here to help if you need any assistance!</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  await transporter.sendMail(mailOptions);
  console.log('Payment failure email sent to:', email);
}

/**
 * Send new order notification to seller
 */
async function sendNewOrderNotificationToSeller(email: string, customerName: string, orderId: string) {
  const mailOptions = {
    from: 'QuickXerox <noreply@quickxerox.com>',
    to: email,
    subject: '🔔 New Order Received - QuickXerox',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #3B82F6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">🔔 New Order!</h1>
          </div>
          <div class="content">
            <p>Good news! You've received a new paid order.</p>
            <p><strong>Order ID:</strong> ${orderId}</p>
            <p><strong>Customer:</strong> ${customerName}</p>
            <p>Login to your seller dashboard to view details and start processing.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  await transporter.sendMail(mailOptions);
  console.log('New order notification sent to seller:', email);
}

export const sendTestEmail = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const { email } = data;

  const mailOptions = {
    from: 'QuickXerox <noreply@quickxerox.com>',
    to: email,
    subject: 'Test Email from QuickXerox',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #3B82F6;">Test Email</h2>
        <p>This is a test email sent from the QuickXerox Admin Dashboard.</p>
        <p>If you received this, the email system is working correctly!</p>
        <p>Time: ${new Date().toLocaleString()}</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true, message: 'Test email sent successfully' };
  } catch (error: any) {
    console.error('Error sending test email:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send test email', error.message);
  }
});