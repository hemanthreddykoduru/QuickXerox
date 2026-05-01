import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import AccountDetails from '../../components/account/AccountDetails';
import OrderHistory from '../../components/account/OrderHistory';
import EditProfileModal from '../../components/account/EditProfileModal';
import { useProfile } from '../../hooks/useProfile';
import { Order } from '../../types';
import { db, auth } from '../../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import Skeleton from '../../components/common/Skeleton';

const AccountPage = () => {
  const navigate = useNavigate();
  const { profile, updateProfile, isInitialized, refreshProfile } = useProfile();
  console.log("AccountPage rendering, isInitialized:", isInitialized, "Profile mobile:", profile?.mobile);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

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

  // Auto-redirect if initialized but not authenticated (fixes "Welcome" screen issue)
  useEffect(() => {
    if (isInitialized && !profile.email && !profile.mobile) {
      // If we are initialized but have no profile data, checks if we are actually logged out
      if (!auth.currentUser) {
        console.log("AccountPage: No user found, redirecting to login");
        navigate('/login', { replace: true });
      }
    }
  }, [isInitialized, profile, navigate]);

  // State for orders
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);

    // Use a ref to store the unsubscribe function to ensure it's accessible for cleanup
    let unsubscribe: (() => void) | undefined;

    if (isInitialized) {
      const userEmail = profile.email || localStorage.getItem('userEmail');

      if (!userEmail) {
        console.log("AccountPage: No email for orders, clearing list.");
        setOrders([]);
        setIsLoadingOrders(false);
      } else {
        setIsLoadingOrders(true);
        console.log("AccountPage: Setting up direct listener for:", userEmail);

        try {
          const q = query(
            collection(db, 'orders'),
            where('customerEmail', '==', userEmail)
          );

          unsubscribe = onSnapshot(q, (querySnapshot) => {
            console.log("AccountPage: Real-time update received from Firestore!");
            const fetchedOrders: Order[] = [];
            querySnapshot.forEach((doc) => {
              fetchedOrders.push({ id: doc.id, ...doc.data() } as Order);
            });

            // Sort by timestamp descending
            fetchedOrders.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            
            console.log(`AccountPage: Setting ${fetchedOrders.length} orders to state.`);
            setOrders(fetchedOrders);
            setIsLoadingOrders(false);
          }, (error) => {
            console.error("AccountPage: Firestore listener error:", error);
            setIsLoadingOrders(false);
          });
        } catch (err) {
          console.error("AccountPage: Setup error:", err);
          setIsLoadingOrders(false);
        }
      }
    }

    return () => {
      if (unsubscribe) {
        console.log("AccountPage: Cleaning up listener");
        unsubscribe();
      }
    };
  }, [profile.email, isInitialized]);

  const handleProfileUpdate = (updatedProfile: typeof profile) => {
    updateProfile(updatedProfile);
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

  const handleRetryProfile = async () => {
    if (auth.currentUser) {
      setIsRetrying(true);
      await refreshProfile(auth.currentUser.uid);
      setIsRetrying(false);
    }
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

  // Fallback if initialized but empty (First-time user or data sync issue)
  if (isInitialized && !profile.email && !profile.mobile) {
    // Check if user is actually logged in but profile is empty (Sync error)
    if (auth.currentUser) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Unable to Load Profile</h2>
            <p className="text-gray-600 mb-6">
              We couldn't load your profile data. Please try again.
            </p>
            <div className="space-y-3">
              <button
                onClick={handleRetryProfile}
                disabled={isRetrying}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {isRetrying ? 'Retrying...' : 'Retry'}
              </button>
              <button
                onClick={handleLogout}
                className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Welcome to QuickXerox!</h2>
          <p className="text-gray-600 mb-6">
            It looks like this is your first time using the app. Please sign in with your mobile number to get started.
          </p>
          <button
            onClick={handleLogout}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Sign In to Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <button
              onClick={handleBack}
              className="text-slate-500 hover:text-indigo-600 p-2 hover:bg-slate-100 rounded-lg transition-all"
              title="Back to Dashboard"
              aria-label="Back to Dashboard"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">My Account</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          <div className="lg:col-span-1">
            <AccountDetails
              profile={profile}
              onEdit={() => setIsEditModalOpen(true)}
            />
          </div>
          <div className="lg:col-span-2">
            <OrderHistory
              orders={orders}
              isLoading={isLoadingOrders}
              userEmail={profile.email}
            />


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