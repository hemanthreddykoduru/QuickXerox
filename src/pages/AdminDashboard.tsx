import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer, Users, ShoppingBag, Settings, LogOut, BarChart, CreditCard, Mail, FileText, Globe } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { auth, db } from '../firebase';
import { doc, getDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

interface RecentSeller {
  id: string;
  name: string;
  shopName?: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [adminProfile, setAdminProfile] = useState<{ email: string; role: string; } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentSellers, setRecentSellers] = useState<RecentSeller[]>([]);

  useEffect(() => {
    const fetchAdminProfile = async () => {
      console.log('Attempting to fetch admin profile...');
      try {
        const user = auth.currentUser;
        console.log('Firebase current user:', user);

        if (!user) {
          console.log('No user found, navigating to admin login.');
          navigate('/admin/login');
          return;
        }

        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        console.log('Admin document data:', adminDoc.data());
        
        if (adminDoc.exists() && adminDoc.data().role === 'admin') {
          console.log('Admin profile found and authorized.');
          setAdminProfile({ email: user.email || '', role: adminDoc.data().role });

          // Fetch recent sellers
          const q = query(collection(db, 'shopOwners'), orderBy('createdAt', 'desc'), limit(5));
          const querySnapshot = await getDocs(q);
          const fetchedRecentSellers: RecentSeller[] = querySnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name || 'N/A',
            shopName: doc.data().shopName || 'N/A',
          }));
          setRecentSellers(fetchedRecentSellers);

        } else {
          console.log('Not authorized as an admin or admin profile not found. Signing out.');
          await auth.signOut();
          navigate('/admin/login');
          toast.error('Not authorized as an admin.');
        }
      } catch (err: any) {
        console.error('Error fetching admin profile or recent sellers:', err);
        setError(err.message || 'Failed to load admin profile or recent sellers.');
        toast.error('Failed to load dashboard data.');
        navigate('/admin/login');
      } finally {
        setIsLoading(false);
        console.log('Finished fetching admin profile. isLoading:', false);
      }
    };

    fetchAdminProfile();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      localStorage.removeItem('isAdminAuthenticated');
      localStorage.removeItem('adminId');
      toast.success('Logged out successfully!');
      navigate('/admin/login');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to log out.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-lg text-gray-700">Loading Admin Dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-lg text-red-600">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Printer className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-xs sm:text-sm text-gray-500">Manage QuickPrint Pro</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-1 sm:space-x-2 px-2 py-1 sm:px-4 sm:py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Manage Sellers Card */}
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 flex flex-col items-start space-y-3">
            <Users className="h-6 w-6 sm:h-7 sm:w-7 text-purple-600" />
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Manage Sellers</h3>
            <p className="text-sm text-gray-500">View, add, and manage print shop partners.</p>
            
            {/* Action Buttons */}
            <div className="w-full space-y-2 mt-3">
              <button
                onClick={() => navigate('/admin/sellers')}
                className="w-full bg-blue-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
              >
                View All Sellers
              </button>
              <button
                onClick={() => navigate('/admin/invite-seller')}
                className="w-full bg-purple-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-md hover:bg-purple-700 transition-colors text-sm"
              >
                Invite New Seller
              </button>
            </div>
            
            {/* Display Recent Sellers */}
            {recentSellers.length > 0 ? (
              <div className="w-full mt-3 border-t pt-3">
                <p className="text-xs font-medium text-gray-500 mb-2">Recent Sellers:</p>
                <div className="max-h-24 overflow-y-auto space-y-1 text-sm">
                  {recentSellers.map((seller) => (
                    <div key={seller.id} className="flex justify-between items-center text-gray-700">
                      <span>{seller.name}</span>
                      <span className="text-gray-500 text-xs">{seller.shopName}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 mt-2">No recent sellers found.</p>
            )}
          </div>

          {/* Manage Orders Card */}
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 flex flex-col items-start space-y-3">
            <ShoppingBag className="h-6 w-6 sm:h-7 sm:w-7 text-green-600" />
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Review Orders</h3>
            <p className="text-sm text-gray-500">Monitor customer orders across all shops.</p>
            <button
              onClick={() => navigate('/admin/orders')}
              className="mt-auto bg-blue-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
            >
              View All Orders
            </button>
          </div>

          {/* System Settings Card */}
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 flex flex-col items-start space-y-3">
            <Settings className="h-6 w-6 sm:h-7 sm:w-7 text-gray-600" />
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900">System Settings</h3>
            <p className="text-sm text-gray-500">Configure global application settings.</p>
            <button
              onClick={() => toast('System settings functionality coming soon!')}
              className="mt-auto bg-gray-200 text-gray-700 px-3 py-1.5 sm:px-4 sm:py-2 rounded-md cursor-not-allowed text-sm"
              disabled
            >
              Configure Settings
            </button>
          </div>

          {/* Analytics & Reports Card */}
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 flex flex-col items-start space-y-3">
            <BarChart className="h-6 w-6 sm:h-7 sm:w-7 text-blue-600" />
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Analytics & Reports</h3>
            <p className="text-sm text-gray-500">Access detailed performance reports.</p>
            <button
              onClick={() => toast('Reports functionality coming soon!')}
              className="mt-auto bg-gray-200 text-gray-700 px-3 py-1.5 sm:px-4 sm:py-2 rounded-md cursor-not-allowed text-sm"
              disabled
            >
              View Reports
            </button>
          </div>

          {/* Customer Management Card */}
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 flex flex-col items-start space-y-3">
            <Users className="h-6 w-6 sm:h-7 sm:w-7 text-orange-600" />
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Customer Management</h3>
            <p className="text-sm text-gray-500">Oversee all customer accounts.</p>
            <button
              onClick={() => toast('Customer management functionality coming soon!')}
              className="mt-auto bg-gray-200 text-gray-700 px-3 py-1.5 sm:px-4 sm:py-2 rounded-md cursor-not-allowed text-sm"
              disabled
            >
              View Customers
            </button>
          </div>

          {/* Email & Notifications Card */}
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 flex flex-col items-start space-y-3">
            <Mail className="h-6 w-6 sm:h-7 sm:w-7 text-red-600" />
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Email & Notifications</h3>
            <p className="text-sm text-gray-500">Configure communication settings.</p>
            <button
              onClick={() => toast('Email settings functionality coming soon!')}
              className="mt-auto bg-gray-200 text-gray-700 px-3 py-1.5 sm:px-4 sm:py-2 rounded-md cursor-not-allowed text-sm"
              disabled
            >
              Manage Communications
            </button>
          </div>

        </div>
      </main>
    </div>
  );
};

export default AdminDashboard; 