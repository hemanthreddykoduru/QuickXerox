import { useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../types';
import { toast } from 'react-hot-toast';
import { doc, setDoc, getDoc, writeBatch } from 'firebase/firestore';
import { db, auth } from '../firebase'; // Import auth

const cleanMobileNumber = (mobile: string): string => {
  return mobile.replace(/[^0-9]/g, '');
};

export const useProfile = () => {
  const [profile, setProfile] = useState<UserProfile>(() => {
    // Initialize based on current auth state and session storage
    const currentUser = auth.currentUser;
    console.log("useProfile init: currentUser?.phoneNumber", currentUser?.phoneNumber);
    console.log("useProfile init: sessionStorage.getItem('userPhone')", sessionStorage.getItem('userPhone'));
    return {
      name: currentUser?.displayName || sessionStorage.getItem('userName') || '',
      mobile: currentUser?.phoneNumber || sessionStorage.getItem('userPhone') || '',
      email: currentUser?.email || sessionStorage.getItem('userEmail') || '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Modify fetchProfile to use UID
  const fetchProfile = useCallback(async (uid: string) => {
    if (!uid) return null;
    
    try {
      setIsLoading(true);
      setError(null);
      console.log('Fetching profile for UID:', uid);
      
      const userRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        console.log('Found user profile in Firebase for UID:', uid);
        const userData = userDoc.data();
        console.log('fetchProfile: userData.mobile', userData.mobile);
        console.log('fetchProfile: auth.currentUser?.phoneNumber', auth.currentUser?.phoneNumber);
        const currentAuthEmail = auth.currentUser?.email || '';

        const fetchedProfile: UserProfile = {
          name: userData.name || '',
          mobile: auth.currentUser?.phoneNumber || userData.mobile || '',
          email: currentAuthEmail || userData.email || '',
          address: userData.address || '',
          city: userData.city || '',
          state: userData.state || '',
          pincode: userData.pincode || '',
          createdAt: userData.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        setProfile(fetchedProfile);
        
        // Store in sessionStorage for current tab
        sessionStorage.setItem('userProfile', JSON.stringify(fetchedProfile));
        sessionStorage.setItem('userName', fetchedProfile.name);
        sessionStorage.setItem('userPhone', fetchedProfile.mobile);
        sessionStorage.setItem('userEmail', fetchedProfile.email);

        return fetchedProfile;
      } else {
        console.log('No user profile found in Firebase for UID:', uid);
        const defaultProfile: UserProfile = {
          name: auth.currentUser?.displayName || '',
          mobile: auth.currentUser?.phoneNumber || '',
          email: auth.currentUser?.email || '',
          address: '',
          city: '',
          state: '',
          pincode: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await setDoc(userRef, defaultProfile, { merge: true });
        setProfile(defaultProfile);
        
        // Store in sessionStorage for current tab
        sessionStorage.setItem('userProfile', JSON.stringify(defaultProfile));
        sessionStorage.setItem('userName', defaultProfile.name);
        sessionStorage.setItem('userPhone', defaultProfile.mobile);
        sessionStorage.setItem('userEmail', defaultProfile.email);

        return defaultProfile;
      }
    } catch (err) {
      console.error('Error fetching or creating profile:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch or create profile';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial profile fetch based on authenticated user UID
  useEffect(() => {
    const initializeProfile = async () => {
      if (!isInitialized) {
        const currentUser = auth.currentUser;
        if (currentUser) {
          await fetchProfile(currentUser.uid);
          setIsInitialized(true);
        } else {
          // Clear session storage for this tab
          setProfile({
            name: '', mobile: '', email: '', address: '', city: '', state: '', pincode: '',
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
          });
          sessionStorage.removeItem('userProfile');
          sessionStorage.removeItem('userName');
          sessionStorage.removeItem('userPhone');
          sessionStorage.removeItem('userEmail');
        setIsInitialized(true);
      }
      }
    };

    // Listen for auth state changes
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        if (!isInitialized || !profile.email || !profile.mobile) {
          fetchProfile(user.uid);
          setIsInitialized(true);
        }
      } else {
        // Clear session storage for this tab
        setProfile({
          name: '', mobile: '', email: '', address: '', city: '', state: '', pincode: '',
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
        });
        sessionStorage.removeItem('userProfile');
        sessionStorage.removeItem('userName');
        sessionStorage.removeItem('userPhone');
        sessionStorage.removeItem('userEmail');
        setIsInitialized(true);
      }
    });

    return () => unsubscribe();
  }, [fetchProfile, isInitialized, profile.email, profile.mobile]);

  const updateUserProfile = async (updatedProfile: Partial<UserProfile>) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user to update profile.');
      }

      const completeProfile: UserProfile = {
        ...profile,
        ...updatedProfile,
        mobile: updatedProfile.mobile || profile.mobile || '',
        email: updatedProfile.email || profile.email || '',
        updatedAt: new Date().toISOString()
      };

      const userRef = doc(db, 'users', currentUser.uid);
      const profileRef = doc(db, 'profiles', currentUser.uid);

      const batch = writeBatch(db);
      batch.set(userRef, {
          ...completeProfile,
          role: 'customer',
          lastLogin: new Date().toISOString(),
          isActive: true
      }, { merge: true });
      batch.set(profileRef, completeProfile, { merge: true });

      await batch.commit();

      // Update session storage for current tab
      setProfile(completeProfile);
      sessionStorage.setItem('userProfile', JSON.stringify(completeProfile));
      sessionStorage.setItem('userName', completeProfile.name);
      sessionStorage.setItem('userPhone', completeProfile.mobile);
      sessionStorage.setItem('userEmail', completeProfile.email);

      console.log('Profile updated successfully:', completeProfile);
      toast.success('Profile updated successfully');
      return completeProfile;
    } catch (err) {
      console.error('Error updating profile:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    profile,
    isLoading,
    error,
    updateProfile: updateUserProfile,
    refreshProfile: async (uid?: string) => {
      const currentUser = auth.currentUser;
      if (currentUser && (uid || currentUser.uid)) {
        await fetchProfile(uid || currentUser.uid);
      } else {
        setProfile({
          name: '', mobile: '', email: '', address: '', city: '', state: '', pincode: '',
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
        });
        sessionStorage.removeItem('userProfile');
        sessionStorage.removeItem('userName');
        sessionStorage.removeItem('userPhone');
        sessionStorage.removeItem('userEmail');
      }
    }
  };
};