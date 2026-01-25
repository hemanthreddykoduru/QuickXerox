# QuickXerox Architecture Overview

## Project Summary
QuickXerox is a web platform connecting customers with printing services (sellers). It features a role-based dashboard system for Customers, Sellers, and Admins, facilitating order management, profile administration, and payments.

## technology Stack
- **Frontend**: React (Vite), TypeScript, TailwindCSS, Bootstrap
- **Backend (Server)**: Node.js, Express (running on port 3001)
- **Serverless**: Firebase Cloud Functions
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth (Phone/OTP via Twilio)
- **Payments**: Razorpay
- **Email**: Nodemailer (Gmail service)

## Architecture Diagram
```mermaid
graph TD
    User[User (Customer/Seller/Admin)] --> Frontend[React Frontend (Vite)]
    
    subgraph Frontend
        Router[React Router]
        Dashboards[Dashboards]
    end
    
    Frontend -->|API Calls (OTP, Profile)| Server[Express Server (Port 3001)]
    Frontend -->|Callable Functions (Payments)| CloudFunctions[Firebase Cloud Functions]
    Frontend -->|Direct Read/Write| Firestore[Firestore Database]
    
    subgraph Backend
        Server -->|Send OTP| Twilio[Twilio API]
        Server -->|Manage Users| FirebaseAuth[Firebase Auth]
        Server -->|Read/Write| Firestore
    end
    
    subgraph Serverless
        CloudFunctions -->|Create Order/Verify| Razorpay[Razorpay API]
        CloudFunctions -->|Send Invite| Nodemailer[Email Service]
        CloudFunctions -->|Trigger on Create| Firestore
    end
```

## Component Breakdown

### 1. Frontend (`/src`)
- **Entry Point**: `main.tsx` initializes the app and `Toaster`.
- **Routing**: `App.tsx` handles role-based routing (`/customerdashboard`, `/seller/dashboard`, `/admin/dashboard`) using `PrivateRoute` wrapper.
- **State**: Auth state is managed via `localStorage` checks (`isAuthenticated`, `isSellerAuthenticated`, etc.), likely synced with Firebase tokens.
- **Key Pages**:
    - `CustomerDashboard.tsx`: Customer interface.
    - `SellerDashboard.tsx`: Seller interface.
    - `AdminDashboard.tsx`: Admin interface.

### 2. Backend Server (`/server`)
- **Main File**: `index.js`.
- **Purpose**: Handles sensitive operations and custom authentication flows.
- **Key Endpoints**:
    - `/api/send-otp`: Sends OTP via Twilio.
    - `/api/verify-otp`: Verifies OTP and generates a custom Firebase Auth token.
    - `/api/users/create`: Creates user records in Firestore.
    - `/api/profile/*`: Manages user profiles.

### 3. Cloud Functions (`/functions`)
- **Main File**: `src/index.ts`.
- **Purpose**: Handles event-driven tasks and secure payment operations.
- **Functions**:
    - `sendSellerInvitation`: Triggered when a document is created in `sellerInvitations` collection. Sends an email invite.
    - `createRazorpayOrder`: HTTPS Callable to initialize a payment.
    - `verifyRazorpayPayment`: HTTPS Callable to verify payment signature server-side.

### 4. Database (Firestore)
- **Collections** (inferred):
    - `users`: User authentication data.
    - `profiles`: Detailed user profiles.
    - `sellerInvitations`: Pending invitations.
    - `orders` (implied by admin order list).

## Key Workflows

### Authentication (OTP)
1. **Frontend** requests OTP via `/api/send-otp`.
2. **Server** sends OTP using Twilio.
3. **Frontend** sends OTP to `/api/verify-otp`.
4. **Server** validates OTP, mints a creation custom Firebase Auth token, and returns it.
5. **Frontend** likely signs in to Firebase with this token.

### Payment Flow
1. **Frontend** calls `createRazorpayOrder` cloud function.
2. **Cloud Function** communicates with Razorpay to create an order ID.
3. **Frontend** initializes Razorpay Checkout.
4. **Frontend** calls `verifyRazorpayPayment` cloud function after successful payment to verify signature.

### Seller Invitation
1. **Admin** creates an invitation (saved to `sellerInvitations` in Firestore).
2. **Cloud Function** `sendSellerInvitation` triggers on creation.
3. **Nodemailer** sends an email with a signup link to the seller.

## Directory Structure
```
QuickXerox/
├── src/                # React Frontend
│   ├── components/     # Reusable UI components
│   ├── pages/          # Full page components (Dashboards, Login)
│   ├── firebase.ts     # Firebase Client SDK init
│   └── App.tsx         # Routing Logic
├── server/             # Express Backend
│   └── index.js        # API endpoints (OTP, Users)
├── functions/          # Firebase Cloud Functions
│   └── src/index.ts    # Serverless logic (Payments, Email)
└── firebase.json       # Firebase Hosting/Functions config
```
