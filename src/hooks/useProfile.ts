import { useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../types';
import { toast } from 'react-hot-toast';
import { doc, setDoc, getDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase'; // Import auth
import { userCache, CACHE_KEYS } from '../utils/cache';

const cleanMobileNumber = (mobile: string): string => {
  return mobile.replace(/[^0-9]/g, '');
};

export const useProfile = () => {
  const [profile, setProfile] = useState<UserProfile>(() => {
    // Initialize based on current auth state and session storage
    const currentUser = auth.currentUser;
    console.log("useProfile init: currentUser?.phoneNumber", currentUser?.phoneNumber);
    console.log("useProfile init: sessionStorage.getItem('userPhone')", sessionStorage.getItem('userPhone'));
    console.log("useProfile init: currentUser", currentUser);
    
    const initialProfile = {
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
    
    console.log("useProfile initial profile:", initialProfile);
    return initialProfile;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Optimized fetchProfile with caching
  const fetchProfile = useCallback(async (uid: string) => {
    if (!uid) return null;
    
    // Check cache first
    const cacheKey = `${CACHE_KEYS.USER_PROFILE}_${uid}`;
    const cachedProfile = userCache.get<UserProfile>(cacheKey);
    if (cachedProfile && !isLoading) {
      setProfile(cachedProfile);
      return cachedProfile;
    }
    
    // Check sessionStorage as fallback
    const sessionProfile = sessionStorage.getItem('userProfile');
    if (sessionProfile && !isLoading) {
      try {
        const parsedProfile = JSON.parse(sessionProfile);
        setProfile(parsedProfile);
        // Cache it for next time
        userCache.set(cacheKey, parsedProfile);
        return parsedProfile;
      } catch (e) {
        // If parsing fails, continue with Firebase fetch
      }
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const userRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
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
        
        // Cache the profile
        userCache.set(cacheKey, fetchedProfile);
        
        // Store all session data at once
        const sessionData = {
          userProfile: JSON.stringify(fetchedProfile),
          userName: fetchedProfile.name,
          userPhone: fetchedProfile.mobile,
          userEmail: fetchedProfile.email
        };
        Object.entries(sessionData).forEach(([key, value]) => {
          sessionStorage.setItem(key, value);
        });

        return fetchedProfile;
      } else {
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
        
        // Create profile and store session data in parallel
        await Promise.all([
          setDoc(userRef, defaultProfile, { merge: true }),
          Promise.resolve(Object.entries({
            userProfile: JSON.stringify(defaultProfile),
            userName: defaultProfile.name,
            userPhone: defaultProfile.mobile,
            userEmail: defaultProfile.email
          }).forEach(([key, value]) => sessionStorage.setItem(key, value)))
        ]);
        
        // Cache the default profile
        userCache.set(cacheKey, defaultProfile);
        
        setProfile(defaultProfile);
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
  }, [isLoading]);

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
          isActive: true,
          updatedAt: serverTimestamp()
      }, { merge: true });
      batch.set(profileRef, { ...completeProfile, updatedAt: serverTimestamp() }, { merge: true });

      await batch.commit();

      // Read back from Firestore to ensure UI and local caches reflect the canonical values
      const [userSnap, profileSnap] = await Promise.all([
        getDoc(userRef),
        getDoc(profileRef)
      ]);
      const canonical = (profileSnap.exists() ? profileSnap.data() : userSnap.data()) as UserProfile | undefined;
      const persistedProfile: UserProfile = {
        ...(canonical || completeProfile)
      } as UserProfile;

      // Update session storage for current tab
      setProfile(persistedProfile);
      sessionStorage.setItem('userProfile', JSON.stringify(persistedProfile));
      sessionStorage.setItem('userName', persistedProfile.name);
      sessionStorage.setItem('userPhone', persistedProfile.mobile);
      sessionStorage.setItem('userEmail', persistedProfile.email);

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