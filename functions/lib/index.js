"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRazorpayPayment = exports.createRazorpayOrderHttp = exports.createRazorpayOrder = exports.sendSellerInvitation = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const nodemailer = __importStar(require("nodemailer"));
const razorpay_1 = __importDefault(require("razorpay"));
const cors_1 = __importDefault(require("cors"));
admin.initializeApp();
// Configure nodemailer with your email service
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: functions.config().email.user,
        pass: functions.config().email.pass
    }
});
// Initialize Razorpay with environment variables
const razorpay = new razorpay_1.default({
    key_id: functions.config().razorpay.key_id,
    key_secret: functions.config().razorpay.key_secret,
});
const corsHandler = (0, cors_1.default)({ origin: true });
exports.sendSellerInvitation = functions.firestore
    .document('sellerInvitations/{invitationId}')
    .onCreate(async (snap, context) => {
    const invitation = snap.data();
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
    }
    catch (error) {
        console.error('Error sending invitation email:', error);
        throw new functions.https.HttpsError('internal', 'Failed to send invitation email');
    }
});
exports.createRazorpayOrder = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const { amount, currency, receipt, notes } = data;
    try {
        const order = await razorpay.orders.create({
            amount: amount * 100,
            currency,
            receipt,
            notes,
        });
        return { orderId: order.id, amount: order.amount, currency: order.currency, key_id: functions.config().razorpay.key_id };
    }
    catch (error) {
        console.error('Error creating Razorpay order:', error);
        throw new functions.https.HttpsError('internal', 'Failed to create Razorpay order', error.message);
    }
});
// HTTP endpoint for Razorpay order creation with CORS
exports.createRazorpayOrderHttp = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== 'POST') {
            return res.status(405).send('Method Not Allowed');
        }
        try {
            const { amount, currency, receipt, notes } = req.body;
            const order = await razorpay.orders.create({
                amount: amount * 100,
                currency,
                receipt,
                notes,
            });
            res.status(200).send({ orderId: order.id, amount: order.amount, currency: order.currency, key_id: functions.config().razorpay.key_id });
        }
        catch (error) {
            console.error('Error creating Razorpay order:', error);
            res.status(500).send({ error: 'Failed to create Razorpay order', details: error.message });
        }
    });
});
exports.verifyRazorpayPayment = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = data;
    try {
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = razorpay_1.default.validateWebhookSignature(body, razorpay_signature, functions.config().razorpay.key_secret);
        if (expectedSignature) {
            return { success: true };
        }
        else {
            throw new functions.https.HttpsError('invalid-argument', 'Signature verification failed');
        }
    }
    catch (error) {
        console.error('Error verifying Razorpay payment:', error);
        throw new functions.https.HttpsError('internal', 'Payment verification failed', error.message);
    }
});
//# sourceMappingURL=index.js.map