const express = require("express");
const cors = require("cors");
// const twilio = require("twilio"); // Removed
const admin = require("firebase-admin");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3001;

// Validate environment variables
const requiredEnvVars = [
  // "TWILIO_ACCOUNT_SID", // Removed
  // "TWILIO_AUTH_TOKEN",  // Removed
  // "TWILIO_PHONE_NUMBER", // Removed
];

const missingEnvVars = requiredEnvVars.filter(
  (varName) => !process.env[varName]
);

if (missingEnvVars.length > 0) {
  console.error("Missing required environment variables:", missingEnvVars);
  process.exit(1);
}

// Initialize Firebase Admin SDK (OPTIONAL FOR TESTING)
let db, authAdmin;
try {
  const serviceAccount = require("./serviceAccountKey.json");
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  db = admin.firestore();
  authAdmin = admin.auth();
  console.log("✅ Firebase initialized successfully");
} catch (error) {
  console.warn("⚠️  Firebase not initialized (running in test mode):", error.message);
  console.warn("⚠️  Webhook endpoint will work, but order updates won't save to Firestore");
  // Create mock db object so code doesn't crash
  db = {
    collection: () => ({
      add: async () => console.log("Mock: would add to Firestore"),
      doc: () => ({
        set: async () => console.log("Mock: would set document"),
        update: async () => console.log("Mock: would update document"),
        get: async () => ({ exists: false })
      }),
      where: () => ({
        get: async () => ({ empty: true, docs: [] })
      })
    })
  };
  authAdmin = null;
}

// Debug: Log environment variables (excluding sensitive data)
console.log("Environment:", {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  TWILIO_CONFIGURED: false,
  // TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
});

// Razorpay configuration
// Initialize Razorpay with Live Keys
const Razorpay = require("razorpay");
const RAZORPAY_KEY_ID = "rzp_live_S6XepASGgegRT0";
const RAZORPAY_KEY_SECRET = "6EJvog3s6eToAejysxYGzTWk";

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

// Create Order Endpoint
app.post("/api/create-order", async (req, res) => {
  try {
    const { amount, currency = "INR", receipt, notes } = req.body;
    
    console.log("Creating Razorpay order:", { amount, currency });

    const options = {
      amount: amount * 100, // amount in the smallest currency unit
      currency,
      receipt,
      notes,
    };

    const order = await razorpay.orders.create(options);
    console.log("Order created:", order);

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create order"
    });
  }
});

// In-memory storage for OTPs (Removed)

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true,
  })
);

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log("Request headers:", req.headers);
  console.log("Request body:", req.body);
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error. Please try again later.",
  });
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  try {
    const response = {
      status: "ok",
      timestamp: new Date().toISOString(),
      twilioConfigured: false,
    };
    console.log("Health check response:", response);
    res.status(200).json(response);
  } catch (error) {
    console.error("Health check error:", error);
    res.status(500).json({
      status: "error",
      error: "Health check failed",
    });
  }
});

// OTP endpoints removed as per user request

// Profile update endpoint
app.post("/api/profile/update", async (req, res) => {
  try {
    console.log("Received profile update request:", req.body);
    // We now expect 'uid' from the frontend to identify the user in Firestore
    const { uid, name, email, address, city, state, pincode, mobile } =
      req.body;

    if (!uid) {
      console.error("UID missing in profile update request");
      return res.status(400).json({
        success: false,
        error: "User ID (UID) is required to update profile.",
      });
    }

    const userRef = db.collection("users").doc(uid);
    const profileRef = db.collection("profiles").doc(uid);

    // Prepare data for update
    const updateData = {
      name: name || "",
      email: email || "",
      address: address || "",
      city: city || "",
      state: state || "",
      pincode: pincode || "",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(), // Use server timestamp
    };

    // Include mobile if provided (useful for OTP users)
    if (mobile) {
      updateData.mobile = mobile; // Add mobile if present
    }

    // Perform batched write to update both user and profile documents
    const batch = db.batch();
    batch.set(userRef, updateData, { merge: true });
    batch.set(profileRef, updateData, { merge: true });

    await batch.commit();

    console.log("Profile updated successfully for UID:", uid);
    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      profile: updateData,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update profile. Missing or insufficient permissions.",
    });
  }
});

// Profile retrieval endpoint
app.get("/api/profile/:uid", async (req, res) => {
  try {
    const uid = req.params.uid;
    if (!uid) {
      return res.status(400).json({ success: false, error: "UID is required" });
    }

    const profileRef = db.collection("profiles").doc(uid);
    const doc = await profileRef.get();

    if (!doc.exists) {
      return res
        .status(404)
        .json({ success: false, error: "Profile not found" });
    }

    res.status(200).json({ success: true, profile: doc.data() });
  } catch (error) {
    console.error("Error retrieving profile:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to retrieve profile." });
  }
});

// User creation endpoint
app.post("/api/users/create", async (req, res) => {
  try {
    console.log("Received user creation request:", req.body);
    const { uid, ...userData } = req.body; // Expect uid from frontend

    if (!uid) {
      return res.status(400).json({
        success: false,
        error: "User ID (UID) is required for user creation",
      });
    }

    // Create user document in Firestore using UID as document ID
    const userRef = db.collection("users").doc(uid);
    await userRef.set({
      ...userData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Create profile document using UID as document ID
    const profileRef = db.collection("profiles").doc(uid);
    await profileRef.set({
      ...userData,
      mobile: userData.mobile || "", // Ensure mobile is stored as a field
      email: userData.email || "", // Ensure email is stored as a field
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: "User created successfully",
      profile: userData,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create user account",
    });
  }
});

// Get user profile endpoint (changed to use UID)
app.get("/api/users/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    console.log("Fetching user profile for UID:", uid);

    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const userData = userDoc.data();
    res.status(200).json({
      success: true,
      profile: userData,
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch user profile",
    });
  }
});

// Update last login endpoint (changed to use UID)
app.post("/api/users/:uid/login", async (req, res) => {
  try {
    const { uid } = req.params;
    const { lastLogin } = req.body;
    console.log("Updating last login for UID:", uid);

    const userRef = db.collection("users").doc(uid);
    await userRef.update({
      lastLogin,
      updatedAt: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: "Last login updated successfully",
    });
  } catch (error) {
    console.error("Error updating last login:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update last login",
    });
  }
});

// ============================================
// RAZORPAY PAYMENT WEBHOOK ENDPOINT (FREE!)
// ============================================

const crypto = require('crypto');

// Razorpay configuration
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'your_webhook_secret_here';

/**
 * Razorpay Webhook Handler
 */
app.post('/api/webhooks/razorpay', async (req, res) => {
  console.log('📥 Razorpay webhook received');
  
  try {
    const webhookSignature = req.headers['x-razorpay-signature'];
    
    if (!webhookSignature) {
      console.error('❌ Webhook rejected: Missing signature');
      return res.status(401).json({ error: 'Missing signature' });
    }

    // Verify signature
    const webhookBody = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
      .update(webhookBody)
      .digest('hex');

    if (webhookSignature !== expectedSignature) {
      console.error('❌ Invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    console.log('✅ Webhook verified');

    const event = req.body.event;
    const payload = req.body.payload;

    // Handle events
    if (event === 'payment.authorized' || event === 'order.paid') {
      const payment = payload.payment.entity;
      const razorpayOrderId = payment.order_id;
      
      // Find and update order
      const ordersRef = db.collection('orders');
      const querySnapshot = await ordersRef.where('razorpayOrderId', '==', razorpayOrderId).get();

      if (!querySnapshot.empty) {
        const orderDoc = querySnapshot.docs[0];
        await orderDoc.ref.update({
          status: 'processing',
          paymentStatus: 'paid',
          paymentId: payment.id,
          paymentMethod: payment.method,
          paidAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log('✅ Order updated:', orderDoc.id);
      }
    } else if (event === 'payment.failed') {
      const payment = payload.payment.entity;
      const razorpayOrderId = payment.order_id;
      
      const ordersRef = db.collection('orders');
      const querySnapshot = await ordersRef.where('razorpayOrderId', '==', razorpayOrderId).get();

      if (!querySnapshot.empty) {
        const orderDoc = querySnapshot.docs[0];
        await orderDoc.ref.update({
          paymentStatus: 'failed',
          paymentFailureReason: payment.error_reason || 'Unknown',
        });
        console.log('❌ Payment failed for order:', orderDoc.id);
      }
    }

    // Log to audit
    await db.collection('auditLogs').add({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      adminEmail: 'system@quickxerox.com',
      action: `Webhook: ${event}`,
      details: `Payment ID: ${payload.payment?.entity?.id || 'N/A'}`,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
});

// 404 handler
app.use((req, res) => {
  console.error("404 Not Found:", req.method, req.url);
  res.status(404).json({
    success: false,
    error: "Not Found",
  });
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log("Environment:", process.env.NODE_ENV || "development");
  console.log(
    "Twilio configured:",
    false
  );
});
