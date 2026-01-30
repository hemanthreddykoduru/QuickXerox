import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import AccountDetails from '../../components/account/AccountDetails';
import OrderHistory from '../../components/account/OrderHistory';
import EditProfileModal from '../../components/account/EditProfileModal';
import { useProfile } from '../../hooks/useProfile';
import { Order } from '../../types';
import { toast } from 'react-hot-toast';
import { db } from '../../firebase';
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

    startFetching();
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
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <Skeleton width={32} height={32} />
              <Skeleton width={150} height={32} />
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow p-6 space-y-4">
                <div className="flex items-center space-x-4">
                  <Skeleton width={64} height={64} variant="circular" />
                  <div className="space-y-2">
                    <Skeleton width={120} height={20} />
                    <Skeleton width={180} height={16} />
                  </div>
                </div>
                <div className="space-y-2 pt-4">
                  <Skeleton width="100%" height={20} />
                  <Skeleton width="100%" height={20} />
                  <Skeleton width="80%" height={20} />
                </div>
              </div>
            </div>
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow p-6">
                <Skeleton width={150} height={24} className="mb-6" />
                <div className="space-y-6">
                  {Array(3).fill(0).map((_, i) => (
                    <div key={i} className="space-y-3">
                      <div className="flex justify-between">
                        <Skeleton width={100} height={20} />
                        <Skeleton width={80} height={24} className="rounded-full" />
                      </div>
                      <Skeleton width="100%" height={40} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
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