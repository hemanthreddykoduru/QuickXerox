const express = require("express");
const cors = require("cors");
const twilio = require("twilio");
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3001;

// Validate environment variables
const requiredEnvVars = [
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_PHONE_NUMBER",
];

const missingEnvVars = requiredEnvVars.filter(
  (varName) => !process.env[varName]
);

if (missingEnvVars.length > 0) {
  console.error("Missing required environment variables:", missingEnvVars);
  process.exit(1);
}

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const authAdmin = admin.auth(); // Initialize Firebase Admin Auth

// Debug: Log environment variables (excluding sensitive data)
console.log("Environment:", {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  TWILIO_CONFIGURED: !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  ),
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
});

// Twilio configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !twilioPhone) {
  console.error("Missing Twilio configuration. Please check your .env file.");
  process.exit(1);
}

const client = twilio(accountSid, authToken);

// In-memory storage for OTPs
const otpStore = new Map();

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
      twilioConfigured: !!(accountSid && authToken && twilioPhone),
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

// Send OTP endpoint
app.post("/api/send-otp", async (req, res) => {
  try {
    console.log("Received send-otp request:", req.body);
    const { mobileNumber } = req.body;

    if (!mobileNumber) {
      console.error("Missing mobile number in request");
      return res.status(400).json({
        success: false,
        error: "Mobile number is required",
      });
    }

    // Validate mobile number format
    if (!/^[6-9]\d{9}$/.test(mobileNumber)) {
      console.error("Invalid mobile number format:", mobileNumber);
      return res.status(400).json({
        success: false,
        error: "Please enter a valid 10-digit Indian mobile number",
      });
    }

    // Check Twilio configuration
    if (!accountSid || !authToken || !twilioPhone) {
      console.error("Twilio configuration missing:", {
        hasAccountSid: !!accountSid,
        hasAuthToken: !!authToken,
        hasPhoneNumber: !!twilioPhone,
      });
      return res.status(500).json({
        success: false,
        error: "SMS service configuration error. Please contact support.",
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const formattedNumber = `+91${mobileNumber}`;

    console.log("Attempting to send OTP:", {
      otp,
      to: formattedNumber,
      from: twilioPhone,
    });

    // Store OTP with timestamp and attempts
    otpStore.set(mobileNumber, {
      otp,
      timestamp: Date.now(),
      attempts: 0,
    });

    try {
      // Send OTP via Twilio
      const message = await client.messages.create({
        body: `Your QuickXerox verification code is: ${otp}. Valid for 1 minute.`,
        from: twilioPhone,
        to: formattedNumber,
      });

      console.log("OTP sent successfully:", {
        messageSid: message.sid,
        status: message.status,
        to: message.to,
      });

      const response = {
        success: true,
        message: "OTP sent successfully",
        timestamp: new Date().toISOString(),
      };
      console.log("Sending response:", response);
      res.status(200).json(response);
    } catch (twilioError) {
      console.error("Twilio API error:", {
        code: twilioError.code,
        message: twilioError.message,
        status: twilioError.status,
        moreInfo: twilioError.moreInfo,
      });
      throw twilioError;
    }
  } catch (error) {
    console.error("Error sending OTP:", {
      name: error.name,
      message: error.message,
      code: error.code,
      status: error.status,
    });
    res.status(500).json({
      success: false,
      error: `Failed to send OTP: ${error.message || "Unknown error"}`,
    });
  }
});

// Verify OTP endpoint
app.post("/api/verify-otp", async (req, res) => {
  try {
    console.log("Received verify-otp request:", req.body);
    const { mobileNumber, otp } = req.body;

    if (!mobileNumber || !otp) {
      console.error("Missing required fields in request");
      return res.status(400).json({
        success: false,
        error: "Mobile number and OTP are required",
      });
    }

    const otpData = otpStore.get(mobileNumber);
    if (!otpData) {
      console.error("No OTP found for:", mobileNumber);
      return res.status(400).json({
        success: false,
        error: "No OTP found. Please request a new OTP.",
      });
    }

    // Check if OTP is expired (1 minute)
    const isExpired = Date.now() - otpData.timestamp > 60000;
    if (isExpired) {
      console.error("OTP expired for:", mobileNumber);
      otpStore.delete(mobileNumber);
      return res.status(400).json({
        success: false,
        error: "OTP has expired. Please request a new OTP.",
      });
    }

    // Increment attempts
    otpData.attempts++;
    if (otpData.attempts > 3) {
      console.error("Too many attempts for:", mobileNumber);
      otpStore.delete(mobileNumber);
      return res.status(400).json({
        success: false,
        error: "Too many attempts. Please request a new OTP.",
      });
    }

    // Verify OTP
    const isValid = otpData.otp === otp;
    if (isValid) {
      console.log("OTP verified successfully for:", mobileNumber);
      otpStore.delete(mobileNumber);

      let uid;
      try {
        // Check if user already exists in Firebase Auth by phone number
        const formattedMobileNumber = `+91${mobileNumber}`;
        let userRecord;
        try {
          userRecord = await authAdmin.getUserByPhoneNumber(
            formattedMobileNumber
          );
        } catch (error) {
          if (error.code === "auth/user-not-found") {
            // User does not exist, create a new one
            userRecord = await authAdmin.createUser({
              phoneNumber: formattedMobileNumber,
            });
            console.log(
              "New Firebase Auth user created for phone number:",
              formattedMobileNumber
            );
          } else {
            throw error;
          }
        }
        uid = userRecord.uid;
        const customToken = await authAdmin.createCustomToken(uid);
        console.log("Custom token generated for UID:", uid);

        const response = {
          success: true,
          message: "OTP verified successfully",
          timestamp: new Date().toISOString(),
          customToken: customToken, // Send custom token to frontend
          uid: uid, // Also send UID for direct use if needed
        };
        console.log("Sending response with custom token:", response);
        res.status(200).json(response);
      } catch (authError) {
        console.error(
          "Error during Firebase Auth user management or token generation:",
          authError
        );
        res.status(500).json({
          success: false,
          error: "Firebase authentication setup failed. Please try again.",
        });
      }
    } else {
      console.error("Invalid OTP for:", mobileNumber);
      res.status(400).json({
        success: false,
        error: "Invalid OTP. Please try again.",
      });
    }
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({
      success: false,
      error: "Failed to verify OTP. Please try again.",
    });
  }
});

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
    !!accountSid && !!authToken && !!twilioPhone
  );
});
