import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

const createAdmin = async () => {
  try {
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      'admin@quickxerox.com',  // Change this to your admin email
      'admin123'               // Change this to your admin password
    );
    
    const user = userCredential.user;
    console.log('Admin user created successfully:', user.uid);

    // Create admin document in Firestore
    await setDoc(doc(db, 'admins', user.uid), {
      email: 'admin@quickxerox.com',
      role: 'admin',
      createdAt: new Date(),
      status: 'active'
    });

    console.log('Admin document created successfully');
  } catch (error) {
    console.error('Error creating admin:', error);
  }
};

// Run the function
createAdmin(); 