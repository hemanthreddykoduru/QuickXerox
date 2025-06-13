const { auth, db } = require('../config/firebase');
const { createUserWithEmailAndPassword } = require('firebase/auth');
const { doc, setDoc } = require('firebase/firestore');

const createSeller = async () => {
  try {
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      'shop@quickxerox.com',
      'shop123'
    );
    
    const user = userCredential.user;
    console.log('User created successfully:', user.uid);

    // Create shop owner document in Firestore
    await setDoc(doc(db, 'shopOwners', user.uid), {
      email: 'shop@quickxerox.com',
      shopName: 'QuickXerox Shop',
      createdAt: new Date(),
      status: 'active',
      // Add any additional shop owner fields you need
    });

    console.log('Shop owner document created successfully');
  } catch (error) {
    console.error('Error creating seller:', error);
  }
};

// Run the function
createSeller(); 