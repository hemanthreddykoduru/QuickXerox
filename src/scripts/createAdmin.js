import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

// Your web app's Firebase configuration
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const createAdmin = async () => {
  let user;
  try {
    // Try to create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      "admin@quickxerox.com",
      "admin123"
    );
    user = userCredential.user;
    console.log("Admin user created successfully in Firebase Auth:", user.uid);
  } catch (error) {
    if (error.code === "auth/email-already-in-use") {
      console.log(
        "Admin email already in use. Proceeding to update Firestore document."
      );
      // If email is already in use, get the existing user
      // Use Firebase Admin SDK or other method to get UID if needed
      // For client-side, you may need to sign in and get currentUser
      // Here, we assume user is already signed in
      user = auth.currentUser;
      if (!user) {
        console.error(
          "Please sign in as admin@quickxerox.com to update Firestore document."
        );
        return;
      }
    } else {
      console.error("Error creating admin in Firebase Auth:", error);
      return;
    }
  }

  if (!user) {
    console.error("Could not obtain user for admin creation.");
    return;
  }

  try {
    // Create or update admin document in Firestore
    await setDoc(
      doc(db, "admins", user.uid),
      {
        email: user.email || "admin@quickxerox.com",
        role: "admin",
        createdAt: new Date(),
        status: "active",
      },
      { merge: true }
    ); // Use merge: true to update if document exists

    console.log(
      "Admin document created/updated successfully in Firestore for UID:",
      user.uid
    );
  } catch (error) {
    console.error(
      "Error creating/updating admin document in Firestore:",
      error
    );
  }
};

// Run the function
createAdmin();
