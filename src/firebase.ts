// src/firebase.ts
import { initializeApp, getApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCLGymyQm9M2EBKQyrooYAYFEbSQwzHplU",
  authDomain: "otp-project-aafc6.firebaseapp.com",
  databaseURL: "https://otp-project-aafc6-default-rtdb.firebaseio.com",
  projectId: "otp-project-aafc6",
  storageBucket: "otp-project-aafc6.firebasestorage.app",
  messagingSenderId: "699242648878",
  appId: "1:699242648878:web:75c97e1bcd263091f296bf",
  measurementId: "G-2DTDTQ6B63",
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
});

export { provider };
