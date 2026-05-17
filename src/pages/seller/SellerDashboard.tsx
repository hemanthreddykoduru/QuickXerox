import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Bell, CreditCard, BarChart, X, Globe, BellRing, Shield, Settings, LogOut, Clock } from 'lucide-react';
import { auth, db } from '../../firebase';
import { doc, setDoc, getDoc, query, collection, onSnapshot, where, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { onAuthStateChanged } from 'firebase/auth';

import OrderList from '../../components/seller/OrderList';
import OrderStats from '../../components/seller/OrderStats';
import RevenueReports from '../../components/seller/RevenueReports';
import TodayOrders from '../../components/seller/TodayOrders';
import { Order, OrderStatus } from '../../types';
import { deleteFile } from '../../services/storageService';

interface PayoutRequest {
  id: string;
  shopId: string;
  amount: number;
  status: 'pending' | 'paid' | 'rejected';
  requestedAt: any;
}


const SellerDashboard: React.FC = () => {
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Payout State
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [payoutAmount, setPayoutAmount] = useState<string>('');
  const [isRequestingPayout, setIsRequestingPayout] = useState(false);

  // Fetch real orders and payouts from Firestore
  useEffect(() => {
    const fetchOrders = () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // Query orders where shopId matches current seller's UID
      const q = query(
        collection(db, 'orders'),
        where('shopId', '==', currentUser.uid)
      );

      const unsubscribeOrders = onSnapshot(q, (querySnapshot) => {
        const fetchedOrders: Order[] = [];
        querySnapshot.forEach((doc) => {
          fetchedOrders.push({ ...doc.data(), id: doc.id } as Order);
        });

        // Exclude failed/cancelled/rejected orders and sort by timestamp descending
        setOrders(
          fetchedOrders
            .filter(order => order.status !== 'failed' && order.status !== 'cancelled' && order.status !== 'rejected')
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        );
        setLoading(false);

        // Auto-cleanup: Delete files from orders completed more than 24 hours ago
        fetchedOrders.forEach(async (order) => {
          if (order.status === 'completed' && (order as any).completedAt) {
            const completedTime = new Date((order as any).completedAt).getTime();
            const now = new Date().getTime();
            const hoursPassed = (now - completedTime) / (1000 * 60 * 60);

            // If more than 72 hours (3 days) have passed, delete the files
            if (hoursPassed > 72 && order.items) {
              console.log(`Cleaning up files for order ${order.id} (completed ${hoursPassed.toFixed(1)} hours ago)`);
              await Promise.all(order.items.map(async (item) => {
                if (item.filePath) {
                  await deleteFile(item.filePath).catch(err =>
                    console.error(`Failed to delete file ${item.filePath}:`, err)
                  );
                }
              }));
            }
          }
        });
      }, (error) => {
        console.error("Error fetching orders:", error);
        toast.error("Failed to load orders");
        setLoading(false);
      });

      // Query payout requests — no orderBy to avoid needing a composite Firestore index
      const payoutQuery = query(
        collection(db, 'payoutRequests'),
        where('shopId', '==', currentUser.uid)
      );

      const unsubscribePayouts = onSnapshot(payoutQuery, (snapshot) => {
        const fetchesPayouts: PayoutRequest[] = [];
        snapshot.forEach(doc => {
          fetchesPayouts.push({ ...doc.data(), id: doc.id } as PayoutRequest);
        });
        // Sort client-side by requestedAt descending
        fetchesPayouts.sort((a, b) => {
          const aTime = a.requestedAt?.toDate ? a.requestedAt.toDate().getTime() : 0;
          const bTime = b.requestedAt?.toDate ? b.requestedAt.toDate().getTime() : 0;
          return bTime - aTime;
        });
        setPayoutRequests(fetchesPayouts);
      }, (err) => {
        console.error('Payout listener error:', err);
      });

      return () => {
        unsubscribeOrders();
        unsubscribePayouts();
      };
    };

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        return fetchOrders();
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');
  const [showReports, setShowReports] = useState(false);
  const [showTodayOrders, setShowTodayOrders] = useState(false);

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    return order.status === filter;
  });

  // Calculate Balances
  const totalEarnings = orders
    .filter(o => o.status === 'completed' || (o.status as any) === 'paid')
    .reduce((sum, order) => sum + (order.total || 0), 0);

  const totalRequested = payoutRequests
    .filter(req => req.status !== 'rejected')
    .reduce((sum, req) => sum + (req.amount || 0), 0);

  const availableBalance = Math.max(0, totalEarnings - totalRequested);

  const handlePayoutRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutAmount || isNaN(Number(payoutAmount)) || Number(payoutAmount) <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }

    const amountNum = Number(payoutAmount);
    if (amountNum > availableBalance) {
      toast.error(`You can only request up to ₹${availableBalance.toFixed(2)}`);
      return;
    }

    if (!bankDetails.isVerified && !bankDetails.accountNumber) {
      toast.error('Please fill in your Bank Details above first.');
      return;
    }

    setIsRequestingPayout(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Not logged in");

      await addDoc(collection(db, 'payoutRequests'), {
        shopId: currentUser.uid,
        shopName: settings.shop.name || 'Unknown Shop',
        amount: amountNum,
        status: 'pending',
        requestedAt: serverTimestamp(),
        bankDetails: {
          accountNumber: bankDetails.accountNumber,
          bankName: bankDetails.bankName,
          ifscCode: bankDetails.ifscCode,
          accountHolderName: bankDetails.accountHolderName
        }
      });

      toast.success(`Successfully requested ₹${amountNum.toFixed(2)} for payout.`);
      setPayoutAmount('');
    } catch (err: any) {
      console.error('Error requesting payout:', err);
      toast.error('Failed to submit payout request.');
    } finally {
      setIsRequestingPayout(false);
    }
  }; const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);

  const [bankDetails, setBankDetails] = useState({
    accountNumber: '',
    bankName: '',
    ifscCode: '',
    accountHolderName: '',
    branchName: '',
    accountType: 'savings',
    mobileNumber: '',
    isVerified: false
  });

  const [bankModalMode, setBankModalMode] = useState<'view' | 'edit'>('view');
  const [bankError, setBankError] = useState('');

  const [settings, setSettings] = useState({
    shop: {
      name: 'QuickPrint Pro',
      ownerName: '',
      address: 'Gitam University, State',
      mobile: '9876543210',
      email: '',
      description: '',
      gstNumber: '',
      timezone: 'Asia/Kolkata',
      perPageCostAdjustment: 0.00,
      shopPictureUrl: '',
    },
    notifications: {
      newOrders: true,
      dailyReport: true,
      paymentReceived: true,
      orderStatusUpdates: true,
      emailNotifications: true,
      smsNotifications: false,
    },
    businessHours: {
      isShopOpen: true,
      monday: { open: true, start: '09:00', end: '18:00' },
      tuesday: { open: true, start: '09:00', end: '18:00' },
      wednesday: { open: true, start: '09:00', end: '18:00' },
      thursday: { open: true, start: '09:00', end: '18:00' },
      friday: { open: true, start: '09:00', end: '18:00' },
      saturday: { open: true, start: '10:00', end: '15:00' },
      sunday: { open: false, start: '09:00', end: '18:00' },
    },
    preferences: {
      autoAcceptOrders: false,
      requireCustomerConfirmation: true,
      allowPreOrders: true,
      maxOrderSize: 100,
      minOrderAmount: 10,
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      perPageCostAdjustment: 0.00,
    },
    security: {
      allowedIpRanges: [] as string[],
    }
  });

  const [activeSettingsTab, setActiveSettingsTab] = useState<'shop' | 'notifications' | 'hours' | 'preferences' | 'security'>('shop');
  const [tempSettings, setTempSettings] = useState(settings); // New state for temporary settings

  const [sellerLocation, setSellerLocation] = useState<string>('Fetching location...');

  // Move fetchSellerDetails out of useEffect
  const fetchSellerDetails = async (uid: string) => {
    try {
      const sellerDocRef = doc(db, 'shopOwners', uid);
      const docSnap = await getDoc(sellerDocRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.bankDetails) {
          setBankDetails(data.bankDetails);
        } else {
          setBankDetails({
            accountNumber: '',
            bankName: '',
            ifscCode: '',
            accountHolderName: '',
            branchName: '',
            accountType: 'savings',
            mobileNumber: '',
            isVerified: false
          });
        }
        if (data.settings) {
          setSettings(data.settings);
          console.log('Fetched seller settings:', data.settings);
        }
      } else {
        console.error("Seller profile not found for UID:", uid);
        toast.error('Seller profile not found.');
        // Optional: Logout here if we are SURE. But for now, let's be safe.
      }
    } catch (err) {
      console.error("Error fetching seller details:", err);
      toast.error('Failed to load seller details. Please checks your connection.');
    }
  };

  useEffect(() => {
    // Load settings from localStorage for initial display (if available)
    const savedSettings = localStorage.getItem('sellerSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }

    // Use onAuthStateChanged to reliably check auth state
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchSellerDetails(user.uid);
      } else {
        // Debounce logout to prevent flickering
        if (localStorage.getItem('isSellerAuthenticated')) {
          setTimeout(() => {
            // Check again after 1 second
            if (!auth.currentUser) {
              console.log("SellerDashboard: Auth confirmed lost after delay. Logging out.");
              localStorage.removeItem('isSellerAuthenticated');
              localStorage.removeItem('sellerId');
              navigate('/seller/login', { replace: true });
            } else {
              console.log("SellerDashboard: Auth restored within grace period.");
            }
          }, 1000);
        }
      }
    });

    // Get seller location on mount
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          // Reverse geocode using OpenStreetMap Nominatim
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await response.json();
            const address = data.address || {};
            const townOrCity = address.city || address.town || address.village || address.hamlet || address.county || 'Unknown location';
            setSellerLocation(townOrCity);
          } catch (err) {
            setSellerLocation('Unknown location');
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
          setSellerLocation('Location unavailable');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    } else {
      setSellerLocation('Geolocation not supported');
    }

    // Clean up the auth listener on unmount
    return () => unsubscribe();
  }, [navigate]);

  const validateBankDetails = () => {
    if (!bankDetails.accountNumber || bankDetails.accountNumber.length < 9) {
      setBankError('Please enter a valid account number');
      return false;
    }
    if (!bankDetails.bankName) {
      setBankError('Please enter bank name');
      return false;
    }
    if (!bankDetails.ifscCode || bankDetails.ifscCode.length !== 11) {
      setBankError('Please enter a valid IFSC code');
      return false;
    }
    if (!bankDetails.accountHolderName) {
      setBankError('Please enter account holder name');
      return false;
    }
    if (!bankDetails.branchName) {
      setBankError('Please enter branch name');
      return false;
    }
    if (!bankDetails.mobileNumber || !/^\d{10}$/.test(bankDetails.mobileNumber)) {
      setBankError('Please enter a valid 10-digit mobile number');
      return false;
    }
    setBankError('');
    return true;
  };

  const handleBankDetailsSave = async () => {
    if (validateBankDetails()) {
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          const sellerDocRef = doc(db, 'shopOwners', currentUser.uid);
          await setDoc(sellerDocRef, { bankDetails }, { merge: true });
          localStorage.setItem('sellerBankDetails', JSON.stringify(bankDetails));
          setBankModalMode('view');
          toast.success('Bank details updated successfully!');
        } catch (error) {
          console.error('Error saving bank details to Firebase:', error);
          setBankError('Failed to save bank details. Please try again.');
        }
      } else {
        setBankError('No authenticated user found. Please log in again.');
      }
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      // 1. Update Firestore
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, { status: newStatus });

      // 2. Update Local State (Optimistic)
      setOrders(orders.map(order =>
        order.id === orderId ? { ...order, status: newStatus } : order
      ));

      toast.success(`Order marked as ${newStatus}`, { id: 'status-update' });

      // 3. Store completion timestamp (files will be cleaned up after 24 hours)
      if (newStatus === 'completed') {
        const orderRef = doc(db, 'orders', orderId);
        await updateDoc(orderRef, {
          completedAt: new Date().toISOString()
        });

        // 4. Check Global System Settings for "Email on order completed"
        let shouldSendEmail = false;
        try {
          const snap = await getDoc(doc(db, 'systemSettings', 'global'));
          if (snap.exists()) {
            const docData = snap.data();
            shouldSendEmail = docData?.notifications?.emailOnOrderCompleted ?? false;
          }
        } catch (err) {
          console.error("Failed to fetch system settings:", err);
        }

        // Send Invoice Email on Completion if enabled
        if (shouldSendEmail) {
          const order = orders.find(o => o.id === orderId);
          if (order && order.invoiceUrl && order.customerEmail) {
            try {
              toast.loading("Mailing invoice to customer...", { id: 'status-update' });
              const emailResponse = await fetch('https://quickxerox-api.vercel.app/api/send-invoice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  email: order.customerEmail,
                  orderId: orderId,
                  pdfUrl: order.invoiceUrl,
                  customerName: order.customerName,
                }),
              });
              const result = await emailResponse.json();
              if (emailResponse.ok && result.success) {
                toast.success("Order completed and invoice mailed!", { id: 'status-update' });
              } else {
                console.error("Failed to send invoice:", result);
                toast.error("Failed to send invoice email", { id: 'status-update' });
              }
            } catch (emailError) {
              console.error("Error calling send-invoice API:", emailError);
              toast.error("Error sending invoice", { id: 'status-update' });
            }
          } else {
            if (!order?.invoiceUrl) console.warn("Skipping invoice email: No invoice URL for order", orderId);
            if (!order?.customerEmail) console.warn("Skipping invoice email: No customer email for order", orderId);
          }
        } else {
          console.log("Invoice email skipped: 'Email on order completed' is disabled in Admin Settings.");
        }
      }
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error(`Failed to update status: ${error.message || 'Unknown error'}`);
    }
  };


  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilter(e.target.value as OrderStatus | 'all');
  };

  const handleLogout = () => {
    localStorage.removeItem('isSellerAuthenticated');
    localStorage.removeItem('sellerId');
    localStorage.removeItem('sellerBankDetails'); // Clear cached bank details
    localStorage.removeItem('sellerSettings');   // Clear cached settings
    navigate('/seller/login');
  };

  const handleSettingsSave = async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      // Basic validation for shop details before saving
      if (!tempSettings.shop.name.trim()) {
        toast.error('Shop Name is required.');
        return;
      }
      if (!tempSettings.shop.mobile || tempSettings.shop.mobile.length !== 10) {
        toast.error('Mobile Number must be 10 digits.');
        return;
      }

      try {
        const sellerDocRef = doc(db, 'shopOwners', currentUser.uid);
        console.log('Saving settings to Firebase:', tempSettings);
        await setDoc(sellerDocRef, { settings: tempSettings }, { merge: true });
        setSettings(tempSettings);
        toast.success('Settings updated successfully!');
        setIsSettingsModalOpen(false);
      } catch (error) {
        console.error('Error saving settings to Firebase:', error);
        toast.error('Failed to save settings. Please try again.');
      }
    } else {
      toast.error('No authenticated user found. Please log in again to save settings.');
    }
  };

  const handleBusinessHoursChange = (day: string, field: string, value: string | boolean) => {
    if (day === 'isShopOpen') {
      setTempSettings(prev => ({
        ...prev,
        businessHours: {
          ...prev.businessHours,
          isShopOpen: value as boolean
        }
      }));
    } else {
      setTempSettings(prev => ({
        ...prev,
        businessHours: {
          ...prev.businessHours,
          [day]: {
            ...(prev.businessHours as any)[day],
            [field]: value
          }
        }
      }));
    }
  };

  const handleExportOrders = () => {
    // Create CSV header
    const headers = ['Order ID', 'Customer Name', 'Items', 'Total Amount', 'Status', 'Date', 'Payment Status'];

    // Create CSV rows from orders
    const csvRows = orders.map(order => [
      order.id,
      order.customerName,
      order.items.map(item => `${item.fileName} (${item.copies} copies)`).join(', '),
      `₹${order.total.toFixed(2)}`,
      order.status,
      new Date(order.timestamp).toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }),
      order.isPaid ? 'Paid' : 'Unpaid'
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n');

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `orders_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img src="/favicon.svg" alt="QuickXerox" className="h-8 w-8 sm:h-9 sm:w-9" />
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">QuickXerox <span className="text-indigo-600">Partner</span></h1>
                <div className="flex items-center space-x-2">
                  <p className="text-xs sm:text-sm text-gray-500">{settings.shop.name}</p>
                  <span className="flex items-center text-xs sm:text-sm text-gray-500">
                    <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                    {sellerLocation}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <button
                className="relative p-1 sm:p-2 text-gray-400 hover:text-gray-500"
                title="Notifications"
                aria-label="View notifications"
              >
                <Bell className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white" />
              </button>
              <button
                className="p-1 sm:p-2 text-gray-400 hover:text-gray-500"
                title="Settings"
                aria-label="Open settings"
                onClick={() => {
                  setTempSettings(JSON.parse(JSON.stringify(settings)));
                  setIsSettingsModalOpen(true);
                }}
              >
                <Settings className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 sm:space-x-2 px-2 py-1 sm:px-4 sm:py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Quick Actions */}
        <div className="mb-6 sm:mb-8 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <button
            onClick={() => {
              setBankModalMode('view');
              setIsBankModalOpen(true);
            }}
            className="flex items-center justify-center space-x-2 p-3 sm:p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
            <span className="font-medium text-gray-900 text-sm sm:text-base">Bank Account</span>
          </button>
          <button
            onClick={() => setShowTodayOrders(!showTodayOrders)}
            className="flex items-center justify-center space-x-2 p-3 sm:p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <Settings className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            <span className="font-medium text-gray-900 text-sm sm:text-base">Today Orders</span>
          </button>
          <button
            onClick={() => setShowReports(!showReports)}
            className="flex items-center justify-center space-x-2 p-3 sm:p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <BarChart className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            <span className="font-medium text-gray-900 text-sm sm:text-base">View Reports</span>
          </button>
        </div>

        {/* Today's Orders Section */}
        {showTodayOrders && (
          <div className="mb-8">
            <TodayOrders orders={orders} onStatusChange={handleStatusChange} isLoading={loading} />
          </div>
        )}

        {/* Reports Section */}
        {showReports && (
          <div className="mb-8">
            <RevenueReports />
          </div>
        )}

        {/* Stats */}
        <OrderStats orders={orders} isLoading={loading} />

        {/* Orders */}
        <div className="mt-6 sm:mt-8">
          <div className="flex flex-col sm:flex-row items-center justify-between mb-4 sm:mb-6 space-y-2 sm:space-y-0">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Recent Orders</h2>
            <div className="flex space-x-2">
              <select
                value={filter}
                onChange={handleFilterChange}
                className="border border-gray-300 rounded-md shadow-sm py-1.5 px-2 bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Filter orders by status"
                title="Filter orders"
              >
                <option value="all">All Orders</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
              </select>
              <button
                onClick={handleExportOrders}
                className="bg-blue-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-md hover:bg-blue-700 transition-colors text-xs sm:text-sm"
                title="Export orders to CSV"
                aria-label="Export orders to CSV"
              >
                Export
              </button>
            </div>
          </div>
          <OrderList
            orders={filteredOrders}
            onStatusChange={handleStatusChange}
            isLoading={loading}
          />
        </div>

      </main>

      {/* Settings Modal */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg w-full max-w-full sm:max-w-4xl max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold">Settings</h2>
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 p-1"
                aria-label="Close settings"
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>

            {/* Settings Tabs */}
            <div className="flex overflow-x-auto whitespace-nowrap space-x-2 sm:space-x-4 mb-4 sm:mb-6 border-b pb-1 no-scrollbar">
              <button
                onClick={() => setActiveSettingsTab('shop')}
                className={`pb-2 px-3 sm:px-4 text-sm sm:text-base border-b-2 transition-colors ${activeSettingsTab === 'shop'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                <Globe className="h-4 w-4 sm:h-5 sm:w-5 inline-block mr-2" />
                Shop Details
              </button>
              <button
                onClick={() => setActiveSettingsTab('notifications')}
                className={`pb-2 px-3 sm:px-4 text-sm sm:text-base border-b-2 transition-colors ${activeSettingsTab === 'notifications'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                <BellRing className="h-4 w-4 sm:h-5 sm:w-5 inline-block mr-2" />
                Notifications
              </button>
              <button
                onClick={() => setActiveSettingsTab('hours')}
                className={`pb-2 px-3 sm:px-4 text-sm sm:text-base border-b-2 transition-colors ${activeSettingsTab === 'hours'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 inline-block mr-2" />
                Business Hours
              </button>
              <button
                onClick={() => setActiveSettingsTab('preferences')}
                className={`pb-2 px-3 sm:px-4 text-sm sm:text-base border-b-2 transition-colors ${activeSettingsTab === 'preferences'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                <Shield className="h-4 w-4 sm:h-5 sm:w-5 inline-block mr-2" />
                Preferences
              </button>
              <button
                onClick={() => setActiveSettingsTab('security')}
                className={`pb-2 px-3 sm:px-4 text-sm sm:text-base border-b-2 transition-colors ${activeSettingsTab === 'security'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                <Shield className="h-4 w-4 sm:h-5 sm:w-5 inline-block mr-2" />
                Security
              </button>
            </div>

            {/* Shop Details Tab */}
            {activeSettingsTab === 'shop' && (
              <div className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700">Shop Name</label>
                    <input
                      type="text"
                      value={tempSettings.shop.name}
                      onChange={(e) => setTempSettings(prev => ({
                        ...prev,
                        shop: { ...prev.shop, name: e.target.value }
                      }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-1.5 sm:py-2 text-sm"
                      placeholder="Enter shop name"
                      aria-label="Shop name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700">GST Number</label>
                    <input
                      type="text"
                      value={tempSettings.shop.gstNumber}
                      onChange={(e) => setTempSettings(prev => ({
                        ...prev,
                        shop: { ...prev.shop, gstNumber: e.target.value }
                      }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-1.5 sm:py-2 text-sm"
                      placeholder="Enter GST number"
                      aria-label="GST number"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700">Mobile Number</label>
                    <input
                      type="tel"
                      value={tempSettings.shop.mobile}
                      onChange={(e) => {
                        // Only allow numbers and limit to 10 digits
                        const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setTempSettings(prev => ({
                          ...prev,
                          shop: { ...prev.shop, mobile: value }
                        }));
                      }}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-1.5 sm:py-2 text-sm"
                      placeholder="Enter 10-digit mobile number"
                      aria-label="Shop mobile number"
                      maxLength={10}
                      pattern="[0-9]{10}"
                      title="Please enter a valid 10-digit mobile number"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700">Shop Owner Name</label>
                    <input
                      type="text"
                      value={tempSettings.shop.ownerName}
                      onChange={(e) => setTempSettings(prev => ({
                        ...prev,
                        shop: { ...prev.shop, ownerName: e.target.value }
                      }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-1.5 sm:py-2 text-sm"
                      placeholder="Enter shop owner's name"
                      aria-label="Shop owner name"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={tempSettings.shop.description}
                    onChange={(e) => setTempSettings(prev => ({
                      ...prev,
                      shop: { ...prev.shop, description: e.target.value }
                    }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-1.5 sm:py-2 text-sm"
                    rows={3}
                    placeholder="Enter shop description"
                    aria-label="Shop description"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700">Shop Picture URL</label>
                  <input
                    type="url"
                    value={tempSettings.shop.shopPictureUrl}
                    onChange={(e) => setTempSettings(prev => ({
                      ...prev,
                      shop: { ...prev.shop, shopPictureUrl: e.target.value }
                    }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-1.5 sm:py-2 text-sm"
                    placeholder="https://example.com/shop-image.jpg"
                    aria-label="Shop picture URL"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Enter a URL to an image of your shop. This will be displayed to customers.
                  </p>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeSettingsTab === 'notifications' && (
              <div className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <input
                      type="checkbox"
                      id="newOrders"
                      checked={tempSettings.notifications.newOrders}
                      onChange={(e) => setTempSettings(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, newOrders: e.target.checked }
                      }))}
                      className="h-4 w-4 text-blue-600"
                    />
                    <label htmlFor="newOrders" className="text-xs sm:text-sm font-medium text-gray-700">
                      New Order Notifications
                    </label>
                  </div>
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <input
                      type="checkbox"
                      id="dailyReport"
                      checked={tempSettings.notifications.dailyReport}
                      onChange={(e) => setTempSettings(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, dailyReport: e.target.checked }
                      }))}
                      className="h-4 w-4 text-blue-600"
                    />
                    <label htmlFor="dailyReport" className="text-xs sm:text-sm font-medium text-gray-700">
                      Daily Sales Report
                    </label>
                  </div>
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <input
                      type="checkbox"
                      id="paymentReceived"
                      checked={tempSettings.notifications.paymentReceived}
                      onChange={(e) => setTempSettings(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, paymentReceived: e.target.checked }
                      }))}
                      className="h-4 w-4 text-blue-600"
                    />
                    <label htmlFor="paymentReceived" className="text-xs sm:text-sm font-medium text-gray-700">
                      Payment Received Notifications
                    </label>
                  </div>
                </div>
                <div className="border-t pt-3 sm:pt-4">
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Notification Channels</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <input
                        type="checkbox"
                        id="emailNotifications"
                        checked={tempSettings.notifications.emailNotifications}
                        onChange={(e) => setTempSettings(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, emailNotifications: e.target.checked }
                        }))}
                        className="h-4 w-4 text-blue-600"
                      />
                      <label htmlFor="emailNotifications" className="text-xs sm:text-sm font-medium text-gray-700">
                        Email Notifications
                      </label>
                    </div>
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <input
                        type="checkbox"
                        id="smsNotifications"
                        checked={tempSettings.notifications.smsNotifications}
                        onChange={(e) => setTempSettings(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, smsNotifications: e.target.checked }
                        }))}
                        className="h-4 w-4 text-blue-600"
                      />
                      <label htmlFor="smsNotifications" className="text-xs sm:text-sm font-medium text-gray-700">
                        SMS Notifications
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Business Hours Tab */}
            {activeSettingsTab === 'hours' && (
              <div className="space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg mb-4 sm:mb-6">
                  <div>
                    <h3 className="text-base sm:text-lg font-medium text-gray-900">Shop Status</h3>
                    <p className="text-xs sm:text-sm text-gray-500">
                      {tempSettings.businessHours.isShopOpen ? 'Currently Open' : 'Currently Closed'}
                    </p>
                  </div>
                  <div className="flex items-center mt-2 sm:mt-0">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tempSettings.businessHours.isShopOpen}
                        onChange={(e) => setTempSettings(prev => ({
                          ...prev,
                          businessHours: {
                            ...prev.businessHours,
                            isShopOpen: e.target.checked
                          }
                        }))}
                        className="sr-only peer"
                        aria-label="Toggle shop open status"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>

                <div className="border-t pt-3 sm:pt-4">
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Business Hours</h3>
                  {Object.entries(tempSettings.businessHours).map(([day, hours]) => {
                    if (day === 'isShopOpen') return null;
                    const dayHours = hours as { open: boolean; start: string; end: string; };
                    return (
                      <div key={day} className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 mb-3 sm:mb-4">
                        <div className="w-20 sm:w-32">
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 capitalize">
                            {day}
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={dayHours.open}
                            onChange={(e) => handleBusinessHoursChange(day, 'open', e.target.checked)}
                            disabled={!tempSettings.businessHours.isShopOpen}
                            className="h-4 w-4 text-blue-600 disabled:opacity-50"
                            aria-label={`${day} open`}
                          />
                          <span className="text-xs sm:text-sm text-gray-500">Open</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="time"
                            value={dayHours.start}
                            onChange={(e) => handleBusinessHoursChange(day, 'start', e.target.value)}
                            disabled={!dayHours.open || !tempSettings.businessHours.isShopOpen}
                            className="border border-gray-300 rounded-md shadow-sm px-2 py-1.5 text-sm disabled:bg-gray-100"
                            aria-label={`${day} start time`}
                          />
                          <span className="text-xs sm:text-sm text-gray-500">to</span>
                          <input
                            type="time"
                            value={dayHours.end}
                            onChange={(e) => handleBusinessHoursChange(day, 'end', e.target.value)}
                            disabled={!dayHours.open || !tempSettings.businessHours.isShopOpen}
                            className="border border-gray-300 rounded-md shadow-sm px-2 py-1.5 text-sm disabled:bg-gray-100"
                            aria-label={`${day} end time`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Preferences Tab */}
            {activeSettingsTab === 'preferences' && (
              <div className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <input
                      type="checkbox"
                      id="autoAcceptOrders"
                      checked={tempSettings.preferences.autoAcceptOrders}
                      onChange={(e) => setTempSettings(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, autoAcceptOrders: e.target.checked }
                      }))}
                      className="h-4 w-4 text-blue-600"
                    />
                    <label htmlFor="autoAcceptOrders" className="text-xs sm:text-sm font-medium text-gray-700">
                      Auto-accept Orders
                    </label>
                  </div>
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <input
                      type="checkbox"
                      id="requireCustomerConfirmation"
                      checked={tempSettings.preferences.requireCustomerConfirmation}
                      onChange={(e) => setTempSettings(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, requireCustomerConfirmation: e.target.checked }
                      }))}
                      className="h-4 w-4 text-blue-600"
                    />
                    <label htmlFor="requireCustomerConfirmation" className="text-xs sm:text-sm font-medium text-gray-700">
                      Require Customer Confirmation
                    </label>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700">Maximum Order Size</label>
                    <input
                      type="number"
                      value={tempSettings.preferences.maxOrderSize}
                      onChange={(e) => setTempSettings(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, maxOrderSize: Number(e.target.value) }
                      }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-1.5 sm:py-2 text-sm"
                      aria-label="Maximum order size"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700">Minimum Order Amount (₹)</label>
                    <input
                      type="number"
                      value={tempSettings.preferences.minOrderAmount}
                      onChange={(e) => setTempSettings(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, minOrderAmount: Number(e.target.value) }
                      }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-1.5 sm:py-2 text-sm"
                      aria-label="Minimum order amount"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700">Per Page Cost Adjustment (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={tempSettings.preferences.perPageCostAdjustment}
                      onChange={(e) => setTempSettings(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, perPageCostAdjustment: Number(e.target.value) }
                      }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-1.5 sm:py-2 text-sm"
                      placeholder="e.g., 0.50"
                      aria-label="Per page cost adjustment"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700">Currency</label>
                    <select
                      value={tempSettings.preferences.currency}
                      onChange={(e) => setTempSettings(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, currency: e.target.value }
                      }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-1.5 sm:py-2 text-sm"
                      aria-label="Currency"
                    >
                      <option value="INR">Indian Rupee (₹)</option>
                      <option value="USD">US Dollar ($)</option>
                      <option value="EUR">Euro (€)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700">Timezone</label>
                    <select
                      value={tempSettings.preferences.timezone}
                      onChange={(e) => setTempSettings(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, timezone: e.target.value }
                      }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-1.5 sm:py-2 text-sm"
                      aria-label="Timezone"
                    >
                      <option value="Asia/Kolkata">India (IST)</option>
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeSettingsTab === 'security' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700">Allowed IP ranges (CIDR, comma separated)</label>
                  <input
                    type="text"
                    value={(tempSettings as any).security?.allowedIpRanges?.join(', ') || ''}
                    onChange={(e) => setTempSettings(prev => ({
                      ...prev,
                      security: {
                        ...(prev as any).security,
                        allowedIpRanges: e.target.value.split(',').map(v => v.trim()).filter(Boolean)
                      }
                    }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-1.5 sm:py-2 text-sm"
                    placeholder="203.0.113.0/24, 198.51.100.12/32"
                    aria-label="Allowed IP ranges"
                    title="Allowed IP ranges"
                  />
                  <p className="mt-1 text-xs text-gray-500">Only requests coming from these IPs will be allowed for seller APIs (if enforced server-side).</p>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2 sm:space-x-4 mt-4 sm:mt-6">
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="bg-gray-300 text-gray-700 px-3 py-1.5 sm:px-4 sm:py-2 rounded-md text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSettingsSave}
                className="bg-blue-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-md text-sm"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bank Account Modal */}
      {isBankModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg w-full max-w-full sm:max-w-2xl max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-0 sm:mb-2">
              <h2 className="text-lg sm:text-xl font-bold">Payouts & Bank Details</h2>
              <div className="flex gap-2">
                {bankModalMode === 'view' && (
                  <button
                    onClick={() => setBankModalMode('edit')}
                    className="text-blue-600 hover:text-blue-800 text-sm px-2 py-1"
                  >
                    Edit Bank Details
                  </button>
                )}
                <button onClick={() => setIsBankModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Balances Section */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-500 mb-1">Total Lifetime Earnings</p>
                <p className="text-2xl font-bold text-gray-900">₹{totalEarnings.toFixed(2)}</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-600 mb-1">Available to Request</p>
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-bold text-blue-900">₹{availableBalance.toFixed(2)}</p>
                  <form onSubmit={handlePayoutRequest} className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      placeholder="Amount"
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)}
                      className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      disabled={isRequestingPayout || availableBalance <= 0}
                      className="bg-blue-600 text-white px-3 py-1 text-sm rounded hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
                    >
                      {isRequestingPayout ? '...' : 'Request'}
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* Payout History Section */}
            {payoutRequests.length > 0 && (
              <div className="mb-6 border-t border-gray-200 pt-4">
                <h3 className="text-md font-semibold mb-3">Recent Payout Requests</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                      <tr>
                        <th className="px-4 py-2">Date</th>
                        <th className="px-4 py-2">Amount</th>
                        <th className="px-4 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payoutRequests.map(req => (
                        <tr key={req.id} className="border-b">
                          <td className="px-4 py-2">
                            {req.requestedAt?.toDate ? req.requestedAt.toDate().toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-4 py-2 font-medium text-gray-900">₹{req.amount?.toFixed(2)}</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium 
                              ${req.status === 'paid' ? 'bg-green-100 text-green-800' :
                                req.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'}`}>
                              {req.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-md font-semibold mb-3">Bank Details {bankModalMode === 'edit' && '(Editing)'}</h3>
              {bankError && (
                <div className="mb-3 sm:mb-4 p-2 bg-red-50 text-red-600 rounded-md text-sm">
                  {bankError}
                </div>
              )}
              <form>
                <div className="mb-3 sm:mb-4">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700">Account Holder Name</label>
                  <input
                    type="text"
                    value={bankDetails.accountHolderName}
                    onChange={(e) =>
                      setBankDetails({
                        ...bankDetails,
                        accountHolderName: e.target.value,
                      })
                    }
                    disabled={bankModalMode === 'view'}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-1.5 sm:py-2 text-sm disabled:bg-gray-100"
                    placeholder="Enter account holder name"
                    aria-label="Account holder name"
                  />
                </div>
                <div className="mb-3 sm:mb-4">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700">Mobile Number</label>
                  <input
                    type="tel"
                    value={bankDetails.mobileNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setBankDetails({
                        ...bankDetails,
                        mobileNumber: value,
                      });
                    }}
                    disabled={bankModalMode === 'view'}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-1.5 sm:py-2 text-sm disabled:bg-gray-100"
                    placeholder="Enter 10-digit mobile number"
                    aria-label="Mobile number"
                    maxLength={10}
                    pattern="[0-9]{10}"
                  />
                </div>
                <div className="mb-3 sm:mb-4">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700">Account Number</label>
                  <input
                    type="text"
                    value={bankDetails.accountNumber}
                    onChange={(e) =>
                      setBankDetails({
                        ...bankDetails,
                        accountNumber: e.target.value,
                      })
                    }
                    disabled={bankModalMode === 'view'}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-1.5 sm:py-2 text-sm disabled:bg-gray-100"
                    placeholder="Enter account number"
                    aria-label="Bank account number"
                  />
                </div>
                <div className="mb-3 sm:mb-4">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700">Bank Name</label>
                  <input
                    type="text"
                    value={bankDetails.bankName}
                    onChange={(e) =>
                      setBankDetails({
                        ...bankDetails,
                        bankName: e.target.value,
                      })
                    }
                    disabled={bankModalMode === 'view'}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-1.5 sm:py-2 text-sm disabled:bg-gray-100"
                    placeholder="Enter bank name"
                    aria-label="Bank name"
                  />
                </div>
                <div className="mb-3 sm:mb-4">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700">Branch Name</label>
                  <input
                    type="text"
                    value={bankDetails.branchName}
                    onChange={(e) =>
                      setBankDetails({
                        ...bankDetails,
                        branchName: e.target.value,
                      })
                    }
                    disabled={bankModalMode === 'view'}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-1.5 sm:py-2 text-sm disabled:bg-gray-100"
                    placeholder="Enter branch name"
                    aria-label="Branch name"
                  />
                </div>
                <div className="mb-3 sm:mb-4">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700">IFSC Code</label>
                  <input
                    type="text"
                    value={bankDetails.ifscCode}
                    onChange={(e) =>
                      setBankDetails({
                        ...bankDetails,
                        ifscCode: e.target.value.toUpperCase(),
                      })
                    }
                    disabled={bankModalMode === 'view'}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-1.5 sm:py-2 text-sm disabled:bg-gray-100"
                    placeholder="Enter IFSC code"
                    aria-label="IFSC code"
                  />
                </div>
                <div className="mb-3 sm:mb-4">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700">Account Type</label>
                  <select
                    value={bankDetails.accountType}
                    onChange={(e) =>
                      setBankDetails({
                        ...bankDetails,
                        accountType: e.target.value,
                      })
                    }
                    disabled={bankModalMode === 'view'}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-1.5 sm:py-2 text-sm disabled:bg-gray-100"
                    aria-label="Account type"
                  >
                    <option value="savings">Savings Account</option>
                    <option value="current">Current Account</option>
                  </select>
                </div>
              </form>

              <div className="flex justify-end space-x-2 sm:space-x-4 mt-4 sm:mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsBankModalOpen(false);
                    setBankModalMode('view');
                    setBankError('');
                  }}
                  className="bg-gray-300 text-gray-700 px-3 py-1.5 sm:px-4 sm:py-2 rounded-md text-sm"
                >
                  {bankModalMode === 'view' ? 'Close' : 'Cancel'}
                </button>
                {bankModalMode === 'edit' && (
                  <button
                    type="button"
                    onClick={handleBankDetailsSave}
                    className="bg-blue-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-md text-sm"
                  >
                    Save
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerDashboard;
