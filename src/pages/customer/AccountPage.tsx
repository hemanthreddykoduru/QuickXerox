import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import AccountDetails from '../../components/account/AccountDetails';
import OrderHistory from '../../components/account/OrderHistory';
import EditProfileModal from '../../components/account/EditProfileModal';
import { useProfile } from '../../hooks/useProfile';
import { Order } from '../../types';
import { toast } from 'react-hot-toast';
import { db, auth } from '../../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import Skeleton from '../../components/common/Skeleton';

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

    // REMOVED: Aggressive auto-logout. It was causing race conditions.
    // Instead, we will handle empty profiles in the UI.
  }, [navigate]);

  // State for orders
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);

  useEffect(() => {
    // Wait for validation - prevent fetching if we don't have a user identifier
    if (!profile.mobile && !profile.email && isInitialized) {
      setIsLoadingOrders(false);
      return;
    }

    // Wait for profile to load (if not initialized yet)
    if (!isInitialized) return;

    const startFetching = async () => {
      // Use mobile OR email to find orders. 
      // Ideally orders are linked by ID, but legacy system uses Phone.
      const userIdentifier = profile.mobile || localStorage.getItem('userPhone');

      if (!userIdentifier) {
        setOrders([]);
        setIsLoadingOrders(false);
        return;
      }

      setIsLoadingOrders(true);
      console.log("Fetching orders for customer:", userIdentifier);

      // Handle potential format mismatches
      const rawPhone = userIdentifier.replace(/\D/g, '').slice(-10);
      const phoneVariations = [
        userIdentifier,
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
          // toast.error("Failed to load order history"); // Silent fail is better than loop spam
          setIsLoadingOrders(false);
        });

        return unsubscribe;
      } catch (err) {
        console.error("Setup error:", err);
        setIsLoadingOrders(false);
      }
    };

    startFetching();
    return () => {
      // cleanup
    };

  }, [profile.mobile, profile.email, isInitialized]);

  const handleProfileUpdate = (updatedProfile: typeof profile) => {
    updateProfile(updatedProfile);
    toast.success('Profile updated successfully!');
  };

  const handleBack = () => {
    navigate('/customerdashboard', { replace: true });
  };

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    sessionStorage.clear();
    auth.signOut();
    navigate('/login');
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Skeleton Loader Code kept same but simplified for brevity in replace if needed, 
             but here keeping it existing or returning standard skeleton */}
        <header className="bg-white shadow-sm"><div className="p-4"><Skeleton width={150} height={32} /></div></header>
        <main className="p-8"><Skeleton width="100%" height={200} /></main>
      </div>
    );
  }

  // Fallback if initialized but empty (The "Ghost" state, but handled gracefully)
  if (isInitialized && !profile.email && !profile.mobile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Account Error</h2>
          <p className="text-gray-600 mb-6">
            We couldn't load your profile setup. You might need to sign in again.
          </p>
          <button
            onClick={handleLogout}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Sign Out & Try Again
          </button>
        </div>
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
            <OrderHistory orders={orders} isLoading={isLoadingOrders} />


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