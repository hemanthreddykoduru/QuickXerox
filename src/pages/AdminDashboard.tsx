import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer, Users, ShoppingBag, Settings, LogOut, BarChart, CreditCard, Mail, FileText, Globe, X, Moon, Sun } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { auth, db } from '../firebase';
import { doc, getDoc, collection, query, orderBy, limit, getDocs, setDoc } from 'firebase/firestore';
import AnalyticsDashboard from '../components/admin/AnalyticsDashboard';

interface RecentSeller {
  id: string;
  name: string;
  shopName?: string;
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
      defaultGateway: 'cashfree' | 'razorpay' | 'none';
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
    roles?: {
      admin: { allowExport: boolean; allowImpersonate: boolean; };
      seller: { allowExport: boolean; };
      viewer: { allowExport: boolean; };
    };
    shopsOrders?: {
      autoApproveShops: boolean;
      unpaidAutoCancelMins: number;
      otpExpiryMins: number;
      maxFilesPerOrder: number;
      maxPagesPerFile: number;
    };
    dataCompliance?: {
      ordersRetentionDays: number;
      logsRetentionDays: number;
      piiMasking: boolean;
    };
    webhooks?: {
      enabled: boolean;
      endpointUrl: string;
      signingSecret: string;
    };
    featureFlags?: {
      aiAnalyzerEnabled: boolean;
      biometricEnabled: boolean;
      newCheckoutEnabled: boolean;
    };
  };

  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
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
    payments: { defaultGateway: 'cashfree', platformFeePercent: 5 },
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

  // Deep-merge helper to keep defaults when loading from Firestore
  const mergeSystemSettings = (base: SystemSettings, loaded: Partial<SystemSettings>): SystemSettings => {
    const merged: SystemSettings = {
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
          // Fetch recent sellers
          const q = query(collection(db, 'shopOwners'), orderBy('createdAt', 'desc'), limit(5));
          const querySnapshot = await getDocs(q);
          const fetchedRecentSellers: RecentSeller[] = querySnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name || 'N/A',
            shopName: doc.data().shopName || 'N/A',
          }));
          setRecentSellers(fetchedRecentSellers);
          // Fetch metrics and audit logs in parallel with timeout
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => {
              didTimeout = true;
              reject(new Error('Dashboard loading timed out. Please try again.'));
            }, timeoutDuration)
          );
          // Replace with actual fetch functions if available
          const fetchMetrics = async () => ({ sellers: 1, orders: 2, revenue: 75, pendingSellers: 1 });
          const fetchAuditLogs = async (): Promise<AuditLog[]> => ([
            { timestamp: "2025-09-17 10:00", adminEmail: "admin@quickxerox.com", action: "Approved Seller", details: "Seller: Alice" },
            { timestamp: "2025-09-17 11:00", adminEmail: "admin@quickxerox.com", action: "Exported Sellers", details: "CSV Download" },
          ]);
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
              className="mt-auto bg-blue-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
            >
              View All Customers
            </button>
          </div>
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

        {/* Metrics Section */}
        <div className="mt-10 mb-8">
          <h2 className="text-xl font-bold mb-4">Dashboard Metrics</h2>
          {metrics ? (
            <div className="flex gap-8 flex-wrap">
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
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center text-gray-500 dark:text-gray-400">
              Loading metrics...
            </div>
          )}
        </div>

        {/* Audit Logs Section */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Audit Logs</h2>
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

                {/* Authentication */}
                <section className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
                  <h3 className="text-lg font-semibold mb-3">Authentication & Security</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={systemSettings.auth.requireEmailVerification}
                        onChange={(e) => setSystemSettings(s => ({ ...s, auth: { ...s.auth, requireEmailVerification: e.target.checked } }))}
                      />
                      Require email verification
                    </label>
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Session timeout (minutes)</label>
                      <input
                        type="number"
                        min={5}
                        value={systemSettings.auth.sessionTimeoutMinutes}
                        onChange={(e) => setSystemSettings(s => ({ ...s, auth: { ...s.auth, sessionTimeoutMinutes: Number(e.target.value) } }))}
                        className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2"
                        aria-label="Session timeout in minutes"
                        title="Session timeout in minutes"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Idle logout (minutes)</label>
                      <input
                        type="number"
                        min={5}
                        value={systemSettings.auth.idleLogoutMinutes}
                        onChange={(e) => setSystemSettings(s => ({ ...s, auth: { ...s.auth, idleLogoutMinutes: Number(e.target.value) } }))}
                        className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2"
                        aria-label="Idle logout minutes"
                        title="Idle logout minutes"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Remember me (days)</label>
                      <input
                        type="number"
                        min={1}
                        value={systemSettings.auth.rememberMeDays}
                        onChange={(e) => setSystemSettings(s => ({ ...s, auth: { ...s.auth, rememberMeDays: Number(e.target.value) } }))}
                        className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2"
                        aria-label="Remember me days"
                        title="Remember me days"
                      />
                    </div>
                  </div>

                  {/* Password policy */}
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mt-4">
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Min length</label>
                      <input
                        type="number"
                        min={6}
                        value={systemSettings.auth.passwordPolicy.minLength}
                        onChange={(e) => setSystemSettings(s => ({ ...s, auth: { ...s.auth, passwordPolicy: { ...s.auth.passwordPolicy, minLength: Number(e.target.value) } } }))}
                        className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2"
                        aria-label="Password min length"
                        title="Password min length"
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={!!systemSettings.auth.passwordPolicy.requireNumber} onChange={(e) => setSystemSettings(s => ({ ...s, auth: { ...s.auth, passwordPolicy: { ...s.auth.passwordPolicy, requireNumber: e.target.checked } } }))} />
                      Number
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={!!systemSettings.auth.passwordPolicy.requireUppercase} onChange={(e) => setSystemSettings(s => ({ ...s, auth: { ...s.auth, passwordPolicy: { ...s.auth.passwordPolicy, requireUppercase: e.target.checked } } }))} />
                      Uppercase
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={!!systemSettings.auth.passwordPolicy.requireLowercase} onChange={(e) => setSystemSettings(s => ({ ...s, auth: { ...s.auth, passwordPolicy: { ...s.auth.passwordPolicy, requireLowercase: e.target.checked } } }))} />
                      Lowercase
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={!!systemSettings.auth.passwordPolicy.requireSpecialChar} onChange={(e) => setSystemSettings(s => ({ ...s, auth: { ...s.auth, passwordPolicy: { ...s.auth.passwordPolicy, requireSpecialChar: e.target.checked } } }))} />
                      Special char
                    </label>
                  </div>

                  {/* 2FA */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={systemSettings.auth.twoFactor.enabled}
                        onChange={(e) => setSystemSettings(s => ({ ...s, auth: { ...s.auth, twoFactor: e.target.checked ? { enabled: true, enforceForAdmins: true, enforceForSellers: false } : { enabled: false } } }))}
                      />
                      2FA enabled
                    </label>
                    {systemSettings.auth.twoFactor.enabled && (
                      <>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={(systemSettings.auth.twoFactor as any).enforceForAdmins} onChange={(e) => setSystemSettings(s => ({ ...s, auth: { ...s.auth, twoFactor: { ...(s.auth.twoFactor as any), enabled: true, enforceForAdmins: e.target.checked } } }))} /> Enforce for admins
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={(systemSettings.auth.twoFactor as any).enforceForSellers} onChange={(e) => setSystemSettings(s => ({ ...s, auth: { ...s.auth, twoFactor: { ...(s.auth.twoFactor as any), enabled: true, enforceForSellers: e.target.checked } } }))} /> Enforce for sellers
                        </label>
                      </>
                    )}
                  </div>

                  {/* Allowed admin IPs */}
                  <div className="mt-4">
                    <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                      Allowed admin IP ranges (exact IP or CIDR notation)
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      Examples: 203.0.113.42 (exact IP) or 203.0.113.0/24 (range). Leave empty to allow all IPs.
                    </p>

                    {/* Show current IP helper */}
                    <div className="mb-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          setFetchingIP(true);
                          try {
                            const response = await fetch('https://api64.ipify.org?format=json');
                            if (!response.ok) throw new Error('Failed to fetch IP');
                            const data = await response.json();
                            setCurrentPublicIP(data.ip);
                            toast.success(`Your public IP: ${data.ip}`);
                          } catch (error) {
                            try {
                              const response = await fetch('https://api.ipify.org?format=json');
                              if (!response.ok) throw new Error('Failed to fetch IP');
                              const data = await response.json();
                              setCurrentPublicIP(data.ip);
                              toast.success(`Your public IP: ${data.ip}`);
                            } catch {
                              toast.error('Failed to fetch your IP');
                            }
                          } finally {
                            setFetchingIP(false);
                          }
                        }}
                        disabled={fetchingIP}
                        className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-1 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
                      >
                        {fetchingIP ? 'Fetching...' : 'Show My Public IP'}
                      </button>
                      {currentPublicIP && (
                        <>
                          <span className="text-xs font-mono bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                            {currentPublicIP}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const current = systemSettings.auth.allowedAdminIpRanges || [];
                              if (!current.includes(currentPublicIP)) {
                                setSystemSettings(s => ({
                                  ...s,
                                  auth: {
                                    ...s.auth,
                                    allowedAdminIpRanges: [...current, currentPublicIP]
                                  }
                                }));
                                toast.success('IP added to allowed list');
                              } else {
                                toast('IP already in the list');
                              }
                            }}
                            className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                          >
                            Add This IP
                          </button>
                        </>
                      )}
                    </div>

                    <input
                      type="text"
                      value={(systemSettings.auth.allowedAdminIpRanges || []).join(', ')}
                      onChange={(e) => {
                        const ips = e.target.value
                          .split(',')
                          .map(ip => ip.trim())
                          .filter(ip => ip.length > 0);
                        setSystemSettings(s => ({
                          ...s,
                          auth: {
                            ...s.auth,
                            allowedAdminIpRanges: ips
                          }
                        }));
                      }}
                      className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2"
                      placeholder="203.0.113.42, 203.0.113.0/24"
                      aria-label="Allowed admin IP ranges"
                      title="Allowed admin IP ranges"
                    />
                    {systemSettings.auth.allowedAdminIpRanges && systemSettings.auth.allowedAdminIpRanges.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {systemSettings.auth.allowedAdminIpRanges.map((ip, idx) => (
                          <div key={idx} className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded flex items-center gap-1">
                            {ip}
                            <button
                              type="button"
                              onClick={() => setSystemSettings(s => ({
                                ...s,
                                auth: {
                                  ...s.auth,
                                  allowedAdminIpRanges: s.auth.allowedAdminIpRanges.filter((_, i) => i !== idx)
                                }
                              }))}
                              className="text-blue-600 dark:text-blue-300 hover:font-bold"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
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
                        <option value="cashfree">Cashfree</option>
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
                            checked={systemSettings.roles?.admin?.allowExport}
                            onChange={(e) => setSystemSettings(s => ({ ...s, roles: { ...s.roles, admin: { ...s.roles.admin, allowExport: e.target.checked } } }))}
                          />
                          Allow export data
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={systemSettings.roles?.admin?.allowImpersonate}
                            onChange={(e) => setSystemSettings(s => ({ ...s, roles: { ...s.roles, admin: { ...s.roles.admin, allowImpersonate: e.target.checked } } }))}
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
                            checked={systemSettings.roles?.seller?.allowExport}
                            onChange={(e) => setSystemSettings(s => ({ ...s, roles: { ...s.roles, seller: { ...s.roles.seller, allowExport: e.target.checked } } }))}
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
                            checked={systemSettings.roles?.viewer?.allowExport}
                            onChange={(e) => setSystemSettings(s => ({ ...s, roles: { ...s.roles, viewer: { ...s.roles.viewer, allowExport: e.target.checked } } }))}
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
                        checked={systemSettings.shopsOrders.autoApproveShops}
                        onChange={(e) => setSystemSettings(s => ({ ...s, shopsOrders: { ...s.shopsOrders, autoApproveShops: e.target.checked } }))}
                      />
                      Auto-approve new shops
                    </label>
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Unpaid order auto-cancel (mins)</label>
                      <input
                        type="number"
                        min={1}
                        value={systemSettings.shopsOrders.unpaidAutoCancelMins}
                        onChange={(e) => setSystemSettings(s => ({ ...s, shopsOrders: { ...s.shopsOrders, unpaidAutoCancelMins: Number(e.target.value) } }))}
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
                        value={systemSettings.shopsOrders.otpExpiryMins}
                        onChange={(e) => setSystemSettings(s => ({ ...s, shopsOrders: { ...s.shopsOrders, otpExpiryMins: Number(e.target.value) } }))}
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
                        value={systemSettings.shopsOrders.maxFilesPerOrder}
                        onChange={(e) => setSystemSettings(s => ({ ...s, shopsOrders: { ...s.shopsOrders, maxFilesPerOrder: Number(e.target.value) } }))}
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
                        value={systemSettings.shopsOrders.maxPagesPerFile}
                        onChange={(e) => setSystemSettings(s => ({ ...s, shopsOrders: { ...s.shopsOrders, maxPagesPerFile: Number(e.target.value) } }))}
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
                        value={systemSettings.dataCompliance.ordersRetentionDays}
                        onChange={(e) => setSystemSettings(s => ({ ...s, dataCompliance: { ...s.dataCompliance, ordersRetentionDays: Number(e.target.value) } }))}
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
                        value={systemSettings.dataCompliance.logsRetentionDays}
                        onChange={(e) => setSystemSettings(s => ({ ...s, dataCompliance: { ...s.dataCompliance, logsRetentionDays: Number(e.target.value) } }))}
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
                        // Save to Firestore
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
        </div>
      )}
      {/* Customers Modal - as shown in previous response */}
      {/* Customer Full Details Modal - as shown in previous response */}
    </div>
  );
};

export default AdminDashboard;
