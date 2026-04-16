import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut, LayoutDashboard, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import AccountDetails from '../../components/account/AccountDetails';
import OrderHistory from '../../components/account/OrderHistory';
import EditProfileModal from '../../components/account/EditProfileModal';
import { useProfile } from '../../hooks/useProfile';
import { Order } from '../../types';
import { db, auth } from '../../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import DashboardSkeleton from '../../components/common/DashboardSkeleton';

const AccountPage = () => {
  const navigate = useNavigate();
  const { profile, updateProfile, isInitialized } = useProfile();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const MotionDiv = motion.div as any;
  const MotionButton = motion.button as any;

  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (isInitialized && !profile.email && !profile.mobile) {
      if (!auth.currentUser) {
        navigate('/login', { replace: true });
      }
    }
  }, [isInitialized, profile, navigate]);

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);

  useEffect(() => {
    if (!profile.email && !profile.mobile && isInitialized) {
      setIsLoadingOrders(false);
      return;
    }
    if (!isInitialized) return;

    const startFetching = async () => {
      const userEmail = profile.email || localStorage.getItem('userEmail');
      if (!userEmail) {
        setOrders([]);
        setIsLoadingOrders(false);
        return;
      }

      setIsLoadingOrders(true);
      try {
        const q = query(
          collection(db, 'orders'),
          where('customerEmail', '==', userEmail)
        );

        const unsubscribe = onSnapshot(q, (querySnapshot: any) => {
          const fetchedOrders: Order[] = [];
          querySnapshot.forEach((doc: any) => {
            fetchedOrders.push({ id: doc.id, ...doc.data() } as Order);
          });
          fetchedOrders.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setOrders(fetchedOrders);
          setIsLoadingOrders(false);
        }, (error: any) => {
          console.error("Error fetching order history:", error);
          setIsLoadingOrders(false);
        });

        return unsubscribe;
      } catch (err) {
        console.error("Setup error:", err);
        setIsLoadingOrders(false);
      }
    };

    startFetching();
  }, [profile.email, isInitialized]);

  const handleProfileUpdate = (updatedProfile: typeof profile) => {
    updateProfile(updatedProfile);
  };

  const handleBack = () => {
    navigate('/customerdashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    sessionStorage.clear();
    auth.signOut();
    navigate('/login');
  };

  if (!isInitialized) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] relative overflow-hidden">
      {/* Premium Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-100/40 blur-[120px] rounded-full" />
        <div className="absolute top-[20%] -right-[10%] w-[30%] h-[50%] bg-indigo-50/40 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] left-[20%] w-[50%] h-[30%] bg-blue-50/40 blur-[120px] rounded-full" />
      </div>

      <header className="bg-white/70 backdrop-blur-xl border-b border-white/40 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <MotionButton
              whileHover={{ scale: 1.05, x: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleBack}
              className="p-2 text-gray-500 hover:text-blue-600 bg-white shadow-sm border border-gray-100 rounded-xl transition-all"
            >
              <ArrowLeft className="h-6 w-6" />
            </MotionButton>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Account</h1>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-1">
                Security & Preferences
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <MotionButton
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/customerdashboard')}
              className="hidden sm:flex items-center space-x-2 px-4 py-2 bg-white border border-gray-100 rounded-xl text-sm font-bold text-gray-600 shadow-sm hover:border-blue-200 hover:text-blue-600 transition-all"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Dashboard</span>
            </MotionButton>
            <MotionButton
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLogout}
              className="p-2.5 text-red-500 hover:bg-red-50 bg-white border border-gray-100 rounded-xl shadow-sm transition-all"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </MotionButton>
          </div>
        </div>
      </header>

      <MotionDiv
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 items-start">
          <div className="lg:col-span-1 lg:sticky lg:top-32">
            <AccountDetails
              profile={profile}
              onEdit={() => setIsEditModalOpen(true)}
            />
            
            <MotionDiv
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-8 p-6 bg-blue-600 rounded-3xl text-white shadow-xl shadow-blue-200 relative overflow-hidden"
            >
              <div className="relative z-10">
                <Shield className="h-8 w-8 mb-4 opacity-80" />
                <h3 className="text-xl font-black mb-2">Secure Printing</h3>
                <p className="text-sm opacity-80 leading-relaxed font-medium">
                  Your documents are encrypted and automatically deleted after printing.
                </p>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl -mr-16 -mt-16 rounded-full" />
            </MotionDiv>
          </div>

          <div className="lg:col-span-2">
            <OrderHistory
              orders={orders}
              isLoading={isLoadingOrders}
              userEmail={profile.email}
            />
          </div>
        </div>
      </MotionDiv>

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