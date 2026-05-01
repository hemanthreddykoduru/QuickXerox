import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';
import Razorpay from 'razorpay';
import * as nodemailer from 'nodemailer';

// Initialize Firebase Admin (Singleton)
if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                // Handle escaped newlines in private key
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            }),
            databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
        });
    } catch (error) {
        console.error('Firebase admin initialization error', error);
    }
}

export const adminDb = admin.firestore();

// Initialize Razorpay
export const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || '',
    key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

// Configure Nodemailer
export const transporter = nodemailer.createTransport({
    host: 'live.smtp.mailtrap.io',
    port: 587,
    secure: false,
    auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD
    }
});

export const allowCors = (fn: (req: VercelRequest, res: VercelResponse) => Promise<any>) => async (req: VercelRequest, res: VercelResponse) => {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    // another option
    // res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    return await fn(req, res);
};

export const validateCoupon = async (couponCode: string, orderAmount: number, userId: string = 'guest') => {
    const couponsRef = adminDb.collection('coupons');
    const querySnapshot = await couponsRef.where('code', '==', couponCode.toUpperCase()).get();

    if (querySnapshot.empty) {
        throw new Error('Invalid coupon code');
    }

    const couponDoc = querySnapshot.docs[0];
    const coupon = couponDoc.data();

    if (!coupon.isActive) {
        throw new Error('Coupon is not active');
    }

    const now = new Date();
    const expiryDate = coupon.expiryDate.toDate();
    
    if (now > expiryDate) {
        console.log(`Coupon Expired: Now(${now.toISOString()}) > Expiry(${expiryDate.toISOString()})`);
        throw new Error('Coupon has expired');
    }

    if (orderAmount < coupon.minOrderAmount) {
        throw new Error(`Minimum order amount is ₹${coupon.minOrderAmount}`);
    }

    if (coupon.usedCount >= coupon.usageLimit) {
        throw new Error('Coupon global usage limit reached');
    }

    // Check per-user limit
    const perUserLimit = coupon.perUserLimit || 1;
    const usageQuery = await adminDb.collection('couponUsage')
        .where('couponId', '==', couponDoc.id)
        .where('userId', '==', userId)
        .count()
        .get();

    if (usageQuery.data().count >= perUserLimit) {
        throw new Error(`You have already used this coupon maximum allowed times.`);
    }

    let discount = 0;
    if (coupon.discountType === 'flat') {
        discount = coupon.discountValue;
    } else if (coupon.discountType === 'percentage') {
        discount = (orderAmount * coupon.discountValue) / 100;
        if (coupon.maxDiscount && discount > coupon.maxDiscount) {
            discount = coupon.maxDiscount;
        }
    }

    if (discount > orderAmount) {
        discount = orderAmount;
    }

    const finalAmount = orderAmount - discount;

    return {
        discount: Math.round(discount),
        finalAmount: Math.round(finalAmount),
        couponId: couponDoc.id,
        code: coupon.code,
    };
};
