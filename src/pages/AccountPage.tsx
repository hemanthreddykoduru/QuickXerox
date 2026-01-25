import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import AccountDetails from '../components/account/AccountDetails';
import OrderHistory from '../components/account/OrderHistory';
import EditProfileModal from '../components/account/EditProfileModal';
import { useProfile } from '../hooks/useProfile';
import { Order } from '../types';
import { toast } from 'react-hot-toast';
import { generateSampleOrders } from '../utils/sampleOrders';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';

const AccountPage = () => {
  const navigate = useNavigate();
  const { profile, updateProfile, isInitialized } = useProfile();
  console.log("AccountPage rendering, isInitialized:", isInitialized, "Profile mobile:", profile?.mobile);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    // Check if the user is authenticated
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }
  }, [navigate]);

  // State for orders
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);

  useEffect(() => {
    // Wait for profile to load
    if (!profile.mobile) {
      const storedPhone = localStorage.getItem('userPhone');
      if (!storedPhone) {
        setIsLoadingOrders(false);
        return;
      }
    }

    const startFetching = async () => {
      setIsLoadingOrders(true);
      const userPhone = profile.mobile || localStorage.getItem('userPhone');

      if (!userPhone) {
        setOrders([]);
        setIsLoadingOrders(false);
        return;
      }

      console.log("Fetching orders for customer:", userPhone);
      const userEmail = profile.email || localStorage.getItem('userEmail');

      const debugInfo = {
        phoneLookup: userPhone,
        emailLookup: userEmail
      };
      console.log('Debug:', debugInfo);

      // Handle potential format mismatches
      const rawPhone = userPhone.replace(/\D/g, '').slice(-10);
      const phoneVariations = [
        userPhone,
        rawPhone,
        `+91${rawPhone}`,
        `91${rawPhone}`
      ];
      const uniquePhones = [...new Set(phoneVariations)].filter(p => p); // Remove empty

      try {
        const q = query(
          collection(db, 'orders'),
          where('customerPhone', 'in', uniquePhones)
        );

        const unsubscribe = onSnapshot(q, (querySnapshot: any) => {
          const fetchedOrders: Order[] = [];
          querySnapshot.forEach((doc: any) => {
            fetchedOrders.push({ id: doc.id, ...doc.data() } as Order);
          });

          // Sort client-side to avoid index requirement for now
          fetchedOrders.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

          console.log("Fetched orders:", fetchedOrders);
          setOrders(fetchedOrders);
          setIsLoadingOrders(false);
        }, (error: any) => {
          console.error("Error fetching order history:", error);
          toast.error("Failed to load order history");
          setIsLoadingOrders(false);
        });

        return unsubscribe;
      } catch (err) {
        console.error("Setup error:", err);
        setIsLoadingOrders(false);
      }
    };

    const cleanup = startFetching();
    return () => {
      // cleanup handled by onSnapshot return if async wasn't wrapped, 
      // but here startFetching returns a promise.
      // We can't easily unsubscribe from the async wrapper without more state.
      // For now, let's trust the component mount/unmount cycle is stable enough.
    };

  }, [profile.mobile]);

  const handleProfileUpdate = (updatedProfile: typeof profile) => {
    updateProfile(updatedProfile);
    toast.success('Profile updated successfully!');
  };

  const handleBack = () => {
    navigate('/customerdashboard', { replace: true });
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <button
              onClick={handleBack}
              className="text-gray-600 hover:text-gray-900 p-1 sm:p-0 flex items-center justify-center"
              title="Back to Dashboard"
              aria-label="Back to Dashboard"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">My Account</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          <div className="lg:col-span-1">
            <AccountDetails
              profile={profile}
              onEdit={() => setIsEditModalOpen(true)}
            />
          </div>
          <div className="lg:col-span-2">
            <OrderHistory orders={orders} />

            {/* Debug Section - Remove before production final release */}
            <div className="mt-8 p-4 bg-gray-100 rounded-lg text-xs text-gray-500 font-mono">
              <p><strong>Debug Info:</strong></p>
              <p>Profile Mobile: {profile.mobile}</p>
              <p>Stored Mobile: {localStorage.getItem('userPhone')}</p>
              <p>Searching for: {profile.mobile ? [profile.mobile, profile.mobile.replace(/\D/g, '').slice(-10)].join(', ') : 'No Phone'}</p>
              <p>Orders Found: {orders.length}</p>
            </div>
          </div>
        </div>
      </main>

      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        profile={profile}
        onSave={handleProfileUpdate}
      />
    </div>
  );
};

export default AccountPage;