import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ShoppingBag, Settings, LogOut, BarChart, X, Moon, Sun, Printer, Mail } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { doc, getDoc, collection, query, orderBy, limit, getDocs, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '../../firebase';
import AnalyticsDashboard from '../../components/admin/AnalyticsDashboard';
import Skeleton from '../../components/common/Skeleton';

interface RecentSeller {
  id: string;
  name: string;
  shopName?: string;
  createdAt: Date;
}

interface AuditLog {
  timestamp: string;
  adminEmail: string;
  action: string;
  details: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [adminProfile, setAdminProfile] = useState<{ email: string; role: string; } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentSellers, setRecentSellers] = useState<RecentSeller[]>([]);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme') as 'light' | 'dark') || 'light');
  const [showSystemSettings, setShowSystemSettings] = useState(false);

  type SystemSettings = {
    branding: {
      appName: string;
    };
    auth: {
      requireEmailVerification: boolean;
      sessionTimeoutMinutes: number;
      idleLogoutMinutes: number;
      rememberMeDays: number;
      passwordPolicy: {
        minLength: number;
        requireNumber: boolean;
        requireUppercase: boolean;
        requireLowercase: boolean;
        requireSpecialChar: boolean;
      };
      twoFactor:
      | { enabled: false }
      | { enabled: true; enforceForAdmins: boolean; enforceForSellers: boolean };
      allowedAdminIpRanges: string[];
    };
    payments: {
      defaultGateway: 'razorpay' | 'none';
      platformFeePercent: number;
    };
    notifications: {
      emailOnOrderCreated: boolean;
      emailOnOrderCompleted: boolean;
      smsOnOrderCreated?: boolean;
      pushOnOrderCompleted?: boolean;
    };
    analytics: {
      defaultRange: '7d' | '30d' | '90d';
    };
    pwa: {
      enable: boolean;
    };
    roles: {
      admin: { allowExport: boolean; allowImpersonate: boolean; };
      seller: { allowExport: boolean; };
      viewer: { allowExport: boolean; };
    };
    shopsOrders: {
      autoApproveShops: boolean;
      unpaidAutoCancelMins: number;
      otpExpiryMins: number;
      maxFilesPerOrder: number;
      maxPagesPerFile: number;
    };
    dataCompliance: {
      ordersRetentionDays: number;
      logsRetentionDays: number;
      piiMasking: boolean;
    };
    webhooks: {
      enabled: boolean;
      endpointUrl: string;
      signingSecret: string;
    };
    featureFlags: {
      aiAnalyzerEnabled: boolean;
      biometricEnabled: boolean;
      newCheckoutEnabled: boolean;
    };
    maintenanceMode: boolean;
  };

  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    maintenanceMode: false,
    branding: { appName: 'QuickXerox' },
    auth: {
      requireEmailVerification: true,
      sessionTimeoutMinutes: 30,
      idleLogoutMinutes: 15,
      rememberMeDays: 14,
      passwordPolicy: {
        minLength: 8,
        requireNumber: true,
        requireUppercase: false,
        requireLowercase: true,
        requireSpecialChar: false,
      },
      twoFactor: { enabled: false },
      allowedAdminIpRanges: [],
    },
    payments: { defaultGateway: 'razorpay', platformFeePercent: 5 },
    notifications: { emailOnOrderCreated: true, emailOnOrderCompleted: true, smsOnOrderCreated: false, pushOnOrderCompleted: false },
    analytics: { defaultRange: '30d' },
    pwa: { enable: true },
    roles: {
      admin: { allowExport: true, allowImpersonate: false },
      seller: { allowExport: true },
      viewer: { allowExport: false },
    },
    shopsOrders: {
      autoApproveShops: false,
      unpaidAutoCancelMins: 30,
      otpExpiryMins: 10,
      maxFilesPerOrder: 10,
      maxPagesPerFile: 200,
    },
    dataCompliance: {
      ordersRetentionDays: 365,
      logsRetentionDays: 90,
      piiMasking: true,
    },
    webhooks: {
      enabled: false,
      endpointUrl: '',
      signingSecret: '',
    },
    featureFlags: {
      aiAnalyzerEnabled: true,
      biometricEnabled: false,
      newCheckoutEnabled: true,
    },
  });
  const [savingSystemSettings, setSavingSystemSettings] = useState(false);
  const [currentPublicIP, setCurrentPublicIP] = useState<string | null>(null);
  const [fetchingIP, setFetchingIP] = useState(false);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);

  // Deep-merge helper to keep defaults when loading from Firestore
  const mergeSystemSettings = (base: SystemSettings, loaded: Partial<SystemSettings>): SystemSettings => {
    const merged: SystemSettings = {
      maintenanceMode: loaded.maintenanceMode ?? base.maintenanceMode,
      branding: { ...base.branding, ...(loaded.branding || {}) },
      auth: {
        ...base.auth,
        ...(loaded.auth || {}),
        passwordPolicy: {
          ...base.auth.passwordPolicy,
          ...(loaded.auth?.passwordPolicy || {}),
        },
        twoFactor: (loaded.auth?.twoFactor) ?? base.auth.twoFactor,
        allowedAdminIpRanges: loaded.auth?.allowedAdminIpRanges ?? base.auth.allowedAdminIpRanges,
      },
      payments: { ...base.payments, ...(loaded.payments || {}) },
      notifications: { ...base.notifications, ...(loaded.notifications || {}) },
      analytics: { ...base.analytics, ...(loaded.analytics || {}) },
      pwa: { ...base.pwa, ...(loaded.pwa || {}) },
      roles: {
        admin: { ...(base.roles?.admin), ...(loaded.roles?.admin) },
        seller: { ...(base.roles?.seller), ...(loaded.roles?.seller) },
        viewer: { ...(base.roles?.viewer), ...(loaded.roles?.viewer) },
      },
      shopsOrders: { ...base.shopsOrders, ...(loaded.shopsOrders || {}) },
      dataCompliance: { ...base.dataCompliance, ...(loaded.dataCompliance || {}) },
      webhooks: { ...base.webhooks, ...(loaded.webhooks || {}) },
      featureFlags: { ...base.featureFlags, ...(loaded.featureFlags || {}) },
    };
    return merged;
  };

  // Customers modal state
  interface CustomerItem {
    id: string;
    name?: string;
    email?: string;
    mobile?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    role?: string;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
    lastLogin?: string;
  }
  const [showCustomers, setShowCustomers] = useState(false);
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersError, setCustomersError] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItem | null>(null);

  // Derived: filtered customers by search
  const filteredCustomers = customers.filter((c) => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return true;
    const hay = [
      c.name ?? '',
      c.email ?? '',
      c.mobile ?? '',
      c.city ?? '',
      c.state ?? '',
      c.pincode ?? '',
      c.id,
    ].join(' ').toLowerCase();
    return hay.includes(q);
  });

  // Metrics and Audit Logs state
  const [metrics, setMetrics] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    // Apply theme on mount and when changed
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark'); else root.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const fetchAdminProfileAndDashboard = async () => {
      let didTimeout = false;
      const timeoutDuration = 10000;
      try {
        // Wait for auth state to be ready
        await new Promise<void>((resolve) => {
          const unsubscribe = auth.onAuthStateChanged((user) => {
            unsubscribe();
            resolve();
          });
        });

        const user = auth.currentUser;
        if (!user) {
          navigate('/admin/login');
          return;
        }
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        if (adminDoc.exists() && adminDoc.data().role === 'admin') {
          setAdminProfile({ email: user.email || '', role: adminDoc.data().role });

          // Fetch recent sellers (last 30 minutes only)
          const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
          const q = query(
            collection(db, 'shopOwners'),
            orderBy('createdAt', 'desc'),
            limit(10) // Fetch more, then filter by time
          );
          const querySnapshot = await getDocs(q);

          // Filter to only include sellers from last 30 minutes
          const fetchedRecentSellers: RecentSeller[] = querySnapshot.docs
            .map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                name: data.name || data.shopName || data.email || 'Unnamed Seller',
                shopName: data.shopName || data.name || 'No shop name',
                createdAt: data.createdAt?.toDate() || new Date(),
              };
            })
            .filter(seller => seller.createdAt >= thirtyMinutesAgo) // Only last 30 min
            .slice(0, 5); // Limit to 5 after filtering

          setRecentSellers(fetchedRecentSellers);
          // Fetch metrics and audit logs in parallel with timeout
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => {
              didTimeout = true;
              reject(new Error('Dashboard loading timed out. Please try again.'));
            }, timeoutDuration)
          );
          // Replace with actual fetch functions if available
          // Real Firestore Metrics (Client-side calculation for reliability)
          const fetchMetrics = async () => {
            try {
              // 1. Fetch all sellers
              const sellersColl = collection(db, 'shopOwners');
              // Exclude specific ID if needed, similar to AdminSellerList
              // const sellersQuery = query(sellersColl, where(documentId(), '!=', 'bEd6Hz5mX0Vm6lgLu5A7Ak2sEfX2'));
              // For now, fetch all to be safe and accurate
              const sellersSnapshot = await getDocs(sellersColl);
              const sellers = sellersSnapshot.docs.map(doc => doc.data());
              const totalSellers = sellers.length;

              const pendingSellers = sellers.filter(s => s.status === 'pending').length;

              // 2. Fetch all orders
              const ordersColl = collection(db, 'orders');
              const ordersSnapshot = await getDocs(ordersColl);
              const orders = ordersSnapshot.docs.map(doc => doc.data());
              const totalOrders = orders.length;

              // 3. Calculate Revenue
              // Sum 'totalAmount' or 'total' from completed/paid orders
              const totalRevenue = orders.reduce((acc, order) => {
                const status = (order.status || '').toLowerCase();
                if (status === 'completed' || status === 'paid') {
                  // Handle inconsistent field names
                  const amount = Number(order.totalAmount || order.total || 0);
                  return acc + amount;
                }
                return acc;
              }, 0);

              return {
                sellers: totalSellers,
                orders: totalOrders,
                revenue: Math.round(totalRevenue),
                pendingSellers: pendingSellers
              };
            } catch (err: any) {
              console.error("Error fetching metrics:", err);
              toast.error(`Metrics Error: ${err.message}`); // Show error to user
              return { sellers: 0, orders: 0, revenue: 0, pendingSellers: 0 };
            }
          };
          const fetchAuditLogs = async (): Promise<AuditLog[]> => {
            try {
              const logsQuery = query(
                collection(db, 'auditLogs'),
                orderBy('timestamp', 'desc'),
                limit(10)
              );
              const logsSnapshot = await getDocs(logsQuery);
              const logs: AuditLog[] = logsSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                  timestamp: data.timestamp instanceof Date
                    ? data.timestamp.toISOString()
                    : (typeof data.timestamp === 'string' ? data.timestamp : new Date(data.timestamp).toISOString()),
                  adminEmail: data.adminEmail || 'N/A',
                  action: data.action || 'Unknown Action',
                  details: data.details || ''
                };
              });
              return logs.length > 0 ? logs : [];
            } catch (error) {
              console.error('Error fetching audit logs:', error);
              return [];
            }
          };
          const result = await Promise.race([
            Promise.all([
              fetchMetrics(),
              fetchAuditLogs(),
            ]),
            timeoutPromise,
          ]);
          if (!didTimeout && Array.isArray(result)) {
            setMetrics(result[0]);
            setAuditLogs(result[1]);
          }
        } else {
          await auth.signOut();
          navigate('/admin/login');
          toast.error('Not authorized as an admin.');
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard data.';
        setError(errorMessage);
        toast.error('Failed to load dashboard data.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchAdminProfileAndDashboard();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      localStorage.removeItem('isAdminAuthenticated');
      localStorage.removeItem('adminId');
      toast.success('Logged out successfully!');
      navigate('/admin/login');
    } catch (error) {
      toast.error('Failed to log out.');
    }
  };

  const downloadCustomersCSV = async () => {
    try {
      const snap = await getDocs(collection(db, 'users'));
      let csv = "name,email,mobile,city,state,pincode,role,isActive,createdAt,lastLogin\n";

      snap.forEach(doc => {
        const d = doc.data();
        csv += `${d.name || ""},${d.email || ""},${d.mobile || ""},${d.city || ""},${d.state || ""},${d.pincode || ""},${d.role || ""},${d.isActive || ""},${d.createdAt || ""},${d.lastLogin || ""} \n`;
      });

      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "QuickXerox_Customers.csv";
      a.click();
      toast.success("Customers CSV Downloaded 📥");

      // Log the export action
      await addDoc(collection(db, 'auditLogs'), {
        action: 'EXPORT_DATA',
        adminEmail: adminProfile?.email || auth.currentUser?.email || 'Unknown',
        details: 'Exported customers list to CSV',
        timestamp: serverTimestamp(),
      });
    } catch (err) {
      toast.error("Failed to export CSV");
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-lg text-gray-700">Loading Admin Dashboard...<br /><span className="text-sm text-gray-400">If this takes too long, please check your network or reload.</span></p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-lg text-red-600">Error: {error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Reload Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Printer className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Admin Dashboard</h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Manage QuickPrint Pro</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Toggle dark mode"
              title="Toggle dark/light"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 sm:space-x-2 px-2 py-1 sm:px-4 sm:py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white"
            >
              <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 animate-page">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* ...existing dashboard cards... */}
          {/* (cards code unchanged) */}
          {/* Manage Sellers Card */}
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 flex flex-col items-start space-y-3">
            <Users className="h-6 w-6 sm:h-7 sm:w-7 text-purple-600" />
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Manage Sellers</h3>
            <p className="text-sm text-gray-500">View, add, and manage print shop partners.</p>
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
            ) : isLoading ? (
              <div className="w-full mt-3 border-t pt-3 space-y-2">
                <Skeleton variant="text" width={80} height={12} className="mb-2" />
                <Skeleton variant="text" width="100%" height={20} />
                <Skeleton variant="text" width="100%" height={20} />
              </div>
            ) : (
              <p className="text-sm text-gray-500 mt-2">No recent sellers found.</p>
            )}
          </div>
          {/* ...other cards unchanged... */}
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
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 flex flex-col items-start space-y-3">
            <Settings className="h-6 w-6 sm:h-7 sm:w-7 text-gray-600" />
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900">System Settings</h3>
            <p className="text-sm text-gray-500">Configure global application settings.</p>
            <button
              onClick={async () => {
                try {
                  const snap = await getDoc(doc(db, 'systemSettings', 'global'));
                  if (snap.exists()) {
                    const loaded = snap.data() as any;
                    setSystemSettings(prev => mergeSystemSettings(prev, loaded));
                  }
                } catch (e) {
                  console.warn('Failed to load system settings', e);
                } finally {
                  setShowSystemSettings(true);
                }
              }}
              className="mt-auto bg-blue-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
            >
              Configure Settings
            </button>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 flex flex-col items-start space-y-3">
            <BarChart className="h-6 w-6 sm:h-7 sm:w-7 text-blue-600" />
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Analytics & Reports</h3>
            <p className="text-sm text-gray-500">Access detailed performance reports.</p>
            <button
              onClick={() => setShowAnalytics(true)}
              className="mt-auto bg-blue-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
            >
              View Analytics
            </button>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 flex flex-col items-start space-y-3">
            <Users className="h-6 w-6 sm:h-7 sm:w-7 text-orange-600" />
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Customer Management</h3>
            <p className="text-sm text-gray-500">Oversee all customer accounts.</p>
            <button
              onClick={async () => {
                setShowCustomers(true);
                setCustomersLoading(true);
                setCustomersError(null);
                try {
                  // Try to order by createdAt if present
                  const usersRef = collection(db, 'users');
                  let usersSnap;
                  try {
                    const qUsers = query(usersRef, orderBy('createdAt', 'desc'));
                    usersSnap = await getDocs(qUsers);
                  } catch {
                    usersSnap = await getDocs(usersRef);
                  }
                  const list: CustomerItem[] = usersSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
                  setCustomers(list);
                } catch (e: any) {
                  console.error('Failed to fetch customers', e);
                  setCustomersError(e?.message || 'Failed to fetch customers');
                  toast.error('Failed to fetch customers');
                } finally {
                  setCustomersLoading(false);
                }
              }}
              className="w-full bg-blue-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
            >
              View All Customers
            </button>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 flex flex-col items-start space-y-3">
            <Mail className="h-6 w-6 sm:h-7 sm:w-7 text-red-600" />
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Email & Notifications</h3>
            <p className="text-sm text-gray-500">Configure communication settings.</p>
            <button
              onClick={() => navigate('/admin/email-templates')}
              className="mt-auto bg-blue-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
            >
              Manage Communications
            </button>
          </div>
        </div>

        {/* Metrics Section */}
        <div className="mt-10 mb-8">
          <h2 className="text-xl font-bold mb-4">Dashboard Metrics</h2>
          {metrics ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
                <div className="text-gray-500 dark:text-gray-400 text-sm">Total Sellers</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{metrics?.sellers ?? 0}</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
                <div className="text-gray-500 dark:text-gray-400 text-sm">Total Orders</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{metrics?.orders ?? 0}</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
                <div className="text-gray-500 dark:text-gray-400 text-sm">Total Revenue</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">₹{metrics?.revenue ?? 0}</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
                <div className="text-gray-500 dark:text-gray-400 text-sm">Pending Sellers</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{metrics?.pendingSellers ?? 0}</div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
                  <Skeleton variant="text" width={80} height={16} className="mx-auto mb-2" />
                  <Skeleton variant="text" width={40} height={32} className="mx-auto" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Audit Logs Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Audit Logs</h2>
            <button
              onClick={() => navigate('/admin/audit-logs')}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View All Logs
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg shadow">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="px-4 py-2 text-left text-gray-600 dark:text-gray-300">Timestamp</th>
                  <th className="px-4 py-2 text-left text-gray-600 dark:text-gray-300">Admin</th>
                  <th className="px-4 py-2 text-left text-gray-600 dark:text-gray-300">Action</th>
                  <th className="px-4 py-2 text-left text-gray-600 dark:text-gray-300">Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs && auditLogs.length > 0 ? (
                  auditLogs.map((log, idx) => (
                    <tr key={idx} className="border-t dark:border-gray-700">
                      <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{log.timestamp}</td>
                      <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{log.adminEmail}</td>
                      <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{log.action}</td>
                      <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{log.details}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                      No audit logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* Analytics Dashboard Modal */}
      {showAnalytics && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
                <button
                  onClick={() => setShowAnalytics(false)}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Close analytics"
                  title="Close analytics"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <AnalyticsDashboard
                onManageUsers={() => setShowCustomers(true)}
                onManageShops={() => navigate('/admin/sellers')}
                onViewOrders={() => navigate('/admin/orders')}
              />
            </div>
          </div>
        </div>
      )}

      {/* Customers Modal */}
      {showCustomers && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">All Customers</h2>
                <div className="flex items-center gap-4">
                  <button
                    onClick={downloadCustomersCSV}
                    className="bg-green-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-md hover:bg-green-700 transition-colors text-sm flex items-center gap-2"
                  >
                    Download CSV 📥
                  </button>
                  <button
                    onClick={() => setShowCustomers(false)}
                    className="text-gray-400 hover:text-gray-600"
                    aria-label="Close customers modal"
                    title="Close"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search customers by name, email, mobile, city..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-md px-4 py-2"
                />
              </div>

              {customersLoading ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Loading customers...</p>
                </div>
              ) : customersError ? (
                <div className="text-center py-8">
                  <p className="text-red-600">Error: {customersError}</p>
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    {customerSearch.trim() ? 'No customers match your search' : 'No customers found'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Mobile</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Location</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredCustomers.map((customer) => (
                        <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                            {customer.name || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                            {customer.email || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                            {customer.mobile || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            {[customer.city, customer.state, customer.pincode].filter(Boolean).join(', ') || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px - 2 py - 1 rounded - full text - xs ${customer.isActive === false
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              } `}>
                              {customer.isActive === false ? 'Inactive' : 'Active'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <button
                              onClick={() => setSelectedCustomer(customer)}
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                Showing {filteredCustomers.length} of {customers.length} customers
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Details Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Customer Details</h2>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Close customer details"
                  title="Close"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                    <p className="text-gray-900 dark:text-gray-100">{selectedCustomer.name || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                    <p className="text-gray-900 dark:text-gray-100">{selectedCustomer.email || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mobile</label>
                    <p className="text-gray-900 dark:text-gray-100">{selectedCustomer.mobile || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                    <p className="text-gray-900 dark:text-gray-100">{selectedCustomer.role || 'Customer'}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                  <p className="text-gray-900 dark:text-gray-100">
                    {selectedCustomer.address || 'N/A'}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City</label>
                    <p className="text-gray-900 dark:text-gray-100">{selectedCustomer.city || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">State</label>
                    <p className="text-gray-900 dark:text-gray-100">{selectedCustomer.state || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pincode</label>
                    <p className="text-gray-900 dark:text-gray-100">{selectedCustomer.pincode || 'N/A'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                    <p className={`${selectedCustomer.isActive === false ? 'text-red-600' : 'text-green-600'} `}>
                      {selectedCustomer.isActive === false ? 'Inactive' : 'Active'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Login</label>
                    <p className="text-gray-900 dark:text-gray-100">
                      {selectedCustomer.lastLogin ? new Date(selectedCustomer.lastLogin).toLocaleString('en-US', {
                        month: '2-digit',
                        day: '2-digit',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      }) : 'Never'}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t dark:border-gray-700">
                  <button
                    onClick={() => setSelectedCustomer(null)}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* System Settings Modal */}
      {showSystemSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">System Settings</h2>
                <button
                  onClick={() => setShowSystemSettings(false)}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Close system settings"
                  title="Close system settings"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Emergency Controls */}
                <section className="bg-red-50 dark:bg-red-900/20 p-4 rounded-md border border-red-200 dark:border-red-800">
                  <h3 className="text-lg font-semibold mb-3 text-red-700 dark:text-red-400 flex items-center gap-2">
                    <LogOut className="h-5 w-5" />
                    Emergency Controls
                  </h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">Maintenance Mode</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Prevent non-admin users from accessing the platform.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={systemSettings.maintenanceMode ?? false}
                        onChange={(e) => setSystemSettings(s => ({ ...s, maintenanceMode: e.target.checked }))}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 dark:peer-focus:ring-red-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-red-600"></div>
                    </label>
                  </div>
                </section>

                {/* Branding */}
                <section className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
                  <h3 className="text-lg font-semibold mb-3">Branding</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">App Name</label>
                      <input
                        type="text"
                        value={systemSettings.branding.appName}
                        onChange={(e) => setSystemSettings(s => ({ ...s, branding: { ...s.branding, appName: e.target.value } }))}
                        className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2"
                        placeholder="QuickXerox"
                        aria-label="Application name"
                        title="Application name"
                      />
                    </div>
                  </div>
                </section>

                {/* Payments */}
                <section className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
                  <h3 className="text-lg font-semibold mb-3">Payments</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Default Gateway</label>
                      <select
                        value={systemSettings.payments.defaultGateway}
                        onChange={(e) => setSystemSettings(s => ({ ...s, payments: { ...s.payments, defaultGateway: e.target.value as any } }))}
                        className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2"
                        aria-label="Default payment gateway"
                        title="Default payment gateway"
                      >
                        <option value="razorpay">Razorpay</option>
                        <option value="none">None</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Platform Fee (%)</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={systemSettings.payments.platformFeePercent}
                        onChange={(e) => setSystemSettings(s => ({ ...s, payments: { ...s.payments, platformFeePercent: Number(e.target.value) } }))}
                        className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2"
                        aria-label="Platform fee percentage"
                        title="Platform fee percentage"
                      />
                    </div>
                  </div>
                </section>

                {/* Notifications */}
                <section className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
                  <h3 className="text-lg font-semibold mb-3">Notifications</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={systemSettings.notifications.emailOnOrderCreated}
                        onChange={(e) => setSystemSettings(s => ({ ...s, notifications: { ...s.notifications, emailOnOrderCreated: e.target.checked } }))}
                      />
                      Email on order created
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={systemSettings.notifications.emailOnOrderCompleted}
                        onChange={(e) => setSystemSettings(s => ({ ...s, notifications: { ...s.notifications, emailOnOrderCompleted: e.target.checked } }))}
                      />
                      Email on order completed
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={systemSettings.notifications.smsOnOrderCreated}
                        onChange={(e) => setSystemSettings(s => ({ ...s, notifications: { ...s.notifications, smsOnOrderCreated: e.target.checked } }))}
                      />
                      SMS on order created
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={systemSettings.notifications.pushOnOrderCompleted}
                        onChange={(e) => setSystemSettings(s => ({ ...s, notifications: { ...s.notifications, pushOnOrderCompleted: e.target.checked } }))}
                      />
                      Push on order completed
                    </label>
                  </div>

                  <div className="mt-4">
                    <button
                      onClick={async () => {
                        const email = adminProfile?.email || auth.currentUser?.email;
                        if (!email) {
                          toast.error('No email found for current user');
                          return;
                        }
                        setSendingTestEmail(true);
                        try {
                          const sendTestEmail = httpsCallable(functions, 'sendTestEmail');
                          await sendTestEmail({ email });
                          toast.success(`Test email sent to ${email} `);
                        } catch (error: any) {
                          console.error('Error sending test email:', error);
                          // Fallback for demo/dev if functions not deployed
                          if (error.message.includes('internal') || error.code === 'functions/internal' || error.message.includes('Method not found') || error.code === 'functions/not-found') {
                            toast.error('Backend function not deployed. Check console.');
                          } else {
                            toast.error('Failed to send test email');
                          }
                        } finally {
                          setSendingTestEmail(false);
                        }
                      }}
                      disabled={sendingTestEmail}
                      className="text-sm bg-blue-100 text-blue-700 px-3 py-1.5 rounded-md hover:bg-blue-200 transition-colors flex items-center gap-2"
                    >
                      <Mail className="h-4 w-4" />
                      {sendingTestEmail ? 'Sending...' : 'Send Test Email'}
                    </button>
                    <p className="text-xs text-gray-500 mt-1">Sends a test email to your logged-in address ({adminProfile?.email || auth.currentUser?.email})</p>
                  </div>
                </section>

                {/* Analytics */}
                <section className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
                  <h3 className="text-lg font-semibold mb-3">Analytics</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Default Range</label>
                      <select
                        value={systemSettings.analytics.defaultRange}
                        onChange={(e) => setSystemSettings(s => ({ ...s, analytics: { ...s.analytics, defaultRange: e.target.value as any } }))}
                        className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2"
                        aria-label="Default analytics range"
                        title="Default analytics range"
                      >
                        <option value="7d">Last 7 days</option>
                        <option value="30d">Last 30 days</option>
                        <option value="90d">Last 90 days</option>
                      </select>
                    </div>
                  </div>
                </section>

                {/* PWA */}
                <section className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
                  <h3 className="text-lg font-semibold mb-3">PWA Settings</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={systemSettings.pwa.enable}
                        onChange={(e) => setSystemSettings(s => ({ ...s, pwa: { ...s.pwa, enable: e.target.checked } }))}
                      />
                      Enable PWA features
                    </label>
                  </div>
                </section>

                {/* Roles */}
                <section className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
                  <h3 className="text-lg font-semibold mb-3">Roles & Permissions</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Admin role permissions</label>
                      <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={systemSettings.roles?.admin?.allowExport ?? false}
                            onChange={(e) => setSystemSettings(s => ({
                              ...s,
                              roles: {
                                ...s.roles,
                                admin: {
                                  ...(s.roles?.admin || { allowExport: true, allowImpersonate: false }),
                                  allowExport: e.target.checked
                                }
                              }
                            }))}
                          />
                          Allow export data
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={systemSettings.roles?.admin?.allowImpersonate ?? false}
                            onChange={(e) => setSystemSettings(s => ({
                              ...s,
                              roles: {
                                ...s.roles,
                                admin: {
                                  ...(s.roles?.admin || { allowExport: true, allowImpersonate: false }),
                                  allowImpersonate: e.target.checked
                                }
                              }
                            }))}
                          />
                          Allow impersonate users
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Seller role permissions</label>
                      <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={systemSettings.roles?.seller?.allowExport ?? false}
                            onChange={(e) => setSystemSettings(s => ({
                              ...s,
                              roles: {
                                ...s.roles,
                                seller: {
                                  ...(s.roles?.seller || { allowExport: true }),
                                  allowExport: e.target.checked
                                }
                              }
                            }))}
                          />
                          Allow export data
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Viewer role permissions</label>
                      <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={systemSettings.roles?.viewer?.allowExport ?? false}
                            onChange={(e) => setSystemSettings(s => ({
                              ...s,
                              roles: {
                                ...s.roles,
                                viewer: {
                                  ...(s.roles?.viewer || { allowExport: false }),
                                  allowExport: e.target.checked
                                }
                              }
                            }))}
                          />
                          Allow export data
                        </label>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Shops & Orders */}
                <section className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
                  <h3 className="text-lg font-semibold mb-3">Shops & Orders</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={systemSettings.shopsOrders?.autoApproveShops ?? false}
                        onChange={(e) => setSystemSettings(s => ({
                          ...s,
                          shopsOrders: {
                            ...(s.shopsOrders || {
                              autoApproveShops: false,
                              unpaidAutoCancelMins: 30,
                              otpExpiryMins: 10,
                              maxFilesPerOrder: 5,
                              maxPagesPerFile: 100
                            }),
                            autoApproveShops: e.target.checked
                          }
                        }))}
                      />
                      Auto-approve new shops
                    </label>
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Unpaid order auto-cancel (mins)</label>
                      <input
                        type="number"
                        min={1}
                        value={systemSettings.shopsOrders?.unpaidAutoCancelMins ?? 30}
                        onChange={(e) => setSystemSettings(s => ({
                          ...s,
                          shopsOrders: {
                            ...(s.shopsOrders || {
                              autoApproveShops: false,
                              unpaidAutoCancelMins: 30,
                              otpExpiryMins: 10,
                              maxFilesPerOrder: 5,
                              maxPagesPerFile: 100
                            }),
                            unpaidAutoCancelMins: Number(e.target.value)
                          }
                        }))}
                        className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2"
                        aria-label="Unpaid order auto-cancel time in minutes"
                        title="Unpaid order auto-cancel time in minutes"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">OTP expiry (mins)</label>
                      <input
                        type="number"
                        min={1}
                        value={systemSettings.shopsOrders?.otpExpiryMins ?? 10}
                        onChange={(e) => setSystemSettings(s => ({
                          ...s,
                          shopsOrders: {
                            ...(s.shopsOrders || {
                              autoApproveShops: false,
                              unpaidAutoCancelMins: 30,
                              otpExpiryMins: 10,
                              maxFilesPerOrder: 5,
                              maxPagesPerFile: 100
                            }),
                            otpExpiryMins: Number(e.target.value)
                          }
                        }))}
                        className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2"
                        aria-label="OTP expiry time in minutes"
                        title="OTP expiry time in minutes"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Max files per order</label>
                      <input
                        type="number"
                        min={1}
                        value={systemSettings.shopsOrders?.maxFilesPerOrder ?? 5}
                        onChange={(e) => setSystemSettings(s => ({
                          ...s,
                          shopsOrders: {
                            ...(s.shopsOrders || {
                              autoApproveShops: false,
                              unpaidAutoCancelMins: 30,
                              otpExpiryMins: 10,
                              maxFilesPerOrder: 5,
                              maxPagesPerFile: 100
                            }),
                            maxFilesPerOrder: Number(e.target.value)
                          }
                        }))}
                        className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2"
                        aria-label="Maximum files allowed per order"
                        title="Maximum files allowed per order"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Max pages per file</label>
                      <input
                        type="number"
                        min={1}
                        value={systemSettings.shopsOrders?.maxPagesPerFile ?? 100}
                        onChange={(e) => setSystemSettings(s => ({
                          ...s,
                          shopsOrders: {
                            ...(s.shopsOrders || {
                              autoApproveShops: false,
                              unpaidAutoCancelMins: 30,
                              otpExpiryMins: 10,
                              maxFilesPerOrder: 5,
                              maxPagesPerFile: 100
                            }),
                            maxPagesPerFile: Number(e.target.value)
                          }
                        }))}
                        className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2"
                        aria-label="Maximum pages allowed per file"
                        title="Maximum pages allowed per file"
                      />
                    </div>
                  </div>
                </section>

                {/* Data & Compliance */}
                <section className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
                  <h3 className="text-lg font-semibold mb-3">Data & Compliance</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Orders retention (days)</label>
                      <input
                        type="number"
                        min={1}
                        value={systemSettings.dataCompliance?.ordersRetentionDays ?? 30}
                        onChange={(e) => setSystemSettings(s => ({
                          ...s,
                          dataCompliance: {
                            ...(s.dataCompliance || { ordersRetentionDays: 30, logsRetentionDays: 90, piiMasking: false }),
                            ordersRetentionDays: Number(e.target.value)
                          }
                        }))}
                        className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2"
                        aria-label="Orders retention period in days"
                        title="Orders retention period in days"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Logs retention (days)</label>
                      <input
                        type="number"
                        min={1}
                        value={systemSettings.dataCompliance?.logsRetentionDays ?? 90}
                        onChange={(e) => setSystemSettings(s => ({
                          ...s,
                          dataCompliance: {
                            ...(s.dataCompliance || { ordersRetentionDays: 30, logsRetentionDays: 90, piiMasking: false }),
                            logsRetentionDays: Number(e.target.value)
                          }
                        }))}
                        className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2"
                        aria-label="Logs retention period in days"
                        title="Logs retention period in days"
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={systemSettings.dataCompliance.piiMasking}
                        onChange={(e) => setSystemSettings(s => ({ ...s, dataCompliance: { ...s.dataCompliance, piiMasking: e.target.checked } }))}
                      />
                      Enable PII masking
                    </label>
                  </div>
                </section>

                {/* Webhooks */}
                <section className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
                  <h3 className="text-lg font-semibold mb-3">Webhooks</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={systemSettings.webhooks.enabled}
                        onChange={(e) => setSystemSettings(s => ({ ...s, webhooks: { ...s.webhooks, enabled: e.target.checked } }))}
                      />
                      Enable webhooks
                    </label>
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Endpoint URL</label>
                      <input
                        type="text"
                        value={systemSettings.webhooks.endpointUrl}
                        onChange={(e) => setSystemSettings(s => ({ ...s, webhooks: { ...s.webhooks, endpointUrl: e.target.value } }))}
                        className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2"
                        placeholder="https://example.com/webhook"
                        aria-label="Webhook endpoint URL"
                        title="Webhook endpoint URL"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Signing Secret</label>
                      <input
                        type="text"
                        value={systemSettings.webhooks.signingSecret}
                        onChange={(e) => setSystemSettings(s => ({ ...s, webhooks: { ...s.webhooks, signingSecret: e.target.value } }))}
                        className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2"
                        placeholder="your-signing-secret"
                        aria-label="Webhook signing secret"
                        title="Webhook signing secret"
                      />
                    </div>
                  </div>
                </section>

                {/* Feature Flags */}
                <section className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
                  <h3 className="text-lg font-semibold mb-3">Feature Flags</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={systemSettings.featureFlags.aiAnalyzerEnabled}
                        onChange={(e) => setSystemSettings(s => ({ ...s, featureFlags: { ...s.featureFlags, aiAnalyzerEnabled: e.target.checked } }))}
                      />
                      AI Analyzer
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={systemSettings.featureFlags.biometricEnabled}
                        onChange={(e) => setSystemSettings(s => ({ ...s, featureFlags: { ...s.featureFlags, biometricEnabled: e.target.checked } }))}
                      />
                      Biometric login
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={systemSettings.featureFlags.newCheckoutEnabled}
                        onChange={(e) => setSystemSettings(s => ({ ...s, featureFlags: { ...s.featureFlags, newCheckoutEnabled: e.target.checked } }))}
                      />
                      New checkout flow
                    </label>
                  </div>
                </section>

                {/* Actions */}
                <div className="flex justify-end gap-4 mt-6">
                  <button
                    onClick={() => setShowSystemSettings(false)}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      setSavingSystemSettings(true);
                      try {
                        await setDoc(doc(db, 'systemSettings', 'global'), systemSettings, { merge: true });
                        toast.success('Settings saved successfully!');
                        setShowSystemSettings(false);
                      } catch (e) {
                        console.error('Error saving settings', e);
                        toast.error('Failed to save settings');
                      } finally {
                        setSavingSystemSettings(false);
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
                    disabled={savingSystemSettings}
                  >
                    {savingSystemSettings && <span className="animate-spin">⏳</span>}
                    Save Settings
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div >
      )}
    </div >
  );
};

export default AdminDashboard;
