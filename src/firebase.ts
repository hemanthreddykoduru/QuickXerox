// src/firebase.ts
import { initializeApp, getApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase app once and export it
export const app = (() => {
  try {
    return initializeApp(firebaseConfig);
  } catch (error: any) {
    // If app is already initialized, get the existing instance
    if (error.code === 'app/duplicate-app') {
      return getApp();
    } else {
      console.error("Error initializing Firebase:", error);
      throw error;
    }
  }
})();

// Initialize services using the exported app
export const analytics = getAnalytics(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

// Connect to emulators in development mode
if (window.location.hostname === "localhost") {
  console.log("Connecting to Firebase Emulators...");
  connectFunctionsEmulator(functions, "localhost", 5001);
  // Optional: Connect other emulators if needed
  // connectFirestoreEmulator(db, 'localhost', 8080); 
}

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === "failed-precondition") {
    console.warn(
      "Multiple tabs open, persistence can only be enabled in one tab at a time."
    );
  } else if (err.code === "unimplemented") {
    console.warn("The current browser does not support persistence.");
  }
});

// Configure Google provider
const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  prompt: "select_account",
  // 'login_hint': 'user@example.com'
});

export const githubProvider = new GithubAuthProvider();

// Preload auth state for faster login
auth.authStateReady().then(() => {
  console.log('Firebase Auth state ready');
});

export { provider };
