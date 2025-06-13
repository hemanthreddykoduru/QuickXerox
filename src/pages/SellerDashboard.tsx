import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer, IndianRupee, Bell, Settings, LogOut, BarChart, CreditCard, Clock, BellRing, Globe, Shield, X } from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

import OrderList from '../components/seller/OrderList';
import OrderStats from '../components/seller/OrderStats';
import RevenueReports from '../components/seller/RevenueReports';
import TodayOrders from '../components/seller/TodayOrders';
import { Order, OrderStatus } from '../types';

const SellerDashboard: React.FC = () => {
  const navigate = useNavigate();

  // Add useEffect to check authentication on component mount
  useEffect(() => {
    const isSellerAuthenticated = localStorage.getItem('isSellerAuthenticated');
    if (isSellerAuthenticated !== 'true') {
      navigate('/seller/login', { replace: true });
      toast.error('You must be logged in to view the seller dashboard.');
    }
  }, [navigate]);

  const [orders, setOrders] = useState<Order[]>([
    {
      id: '1',
      customerName: 'John Doe',
      items: [
        { id: '1', fileName: 'document.pdf', copies: 2, isColor: true, pages: 5 }
      ],
      total: 25.00,
      status: 'pending',
      timestamp: new Date().toISOString(),
      shopId: 1,
      isPaid: true
    },
    {
      id: '2',
      customerName: 'Jane Smith',
      items: [
        { id: '2', fileName: 'presentation.pdf', copies: 1, isColor: false, pages: 10 }
      ],
      total: 15.00,
      status: 'processing',
      timestamp: new Date().toISOString(),
      shopId: 1,
      isPaid: true
    }
  ]);

  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');
  const [showReports, setShowReports] = useState(false);
  const [showTodayOrders, setShowTodayOrders] = useState(false);

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    return order.status === filter;
  });

  const [sellerDetails, setSellerDetails] = useState({
    name: 'QuickPrint Pro',
    address: 'Gitam University, State',
    mobile: '9876543210',
    email: 'quickprint@example.com',
    bankDetails: {
      accountNumber: '123456789012',
      bankName: 'State Bank of India',
      ifscCode: 'SBIN0001234',
    },
  });

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
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
      address: 'Gitam University, State',
      mobile: '9876543210',
      email: 'quickprint@example.com',
      description: '',
      gstNumber: '',
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
    }
  });

  const [activeSettingsTab, setActiveSettingsTab] = useState<'shop' | 'notifications' | 'hours' | 'preferences'>('shop');

  useEffect(() => {
    // Load bank details from localStorage
    const savedBankDetails = localStorage.getItem('sellerBankDetails');
    if (savedBankDetails) {
      setBankDetails(JSON.parse(savedBankDetails));
    }

    // Load settings from localStorage
    const savedSettings = localStorage.getItem('sellerSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }

    // Load seller details from Firebase
    const fetchSellerDetails = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const sellerDocRef = doc(db, 'shopOwners', currentUser.uid);
        const docSnap = await getDoc(sellerDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.bankDetails) {
            setBankDetails(data.bankDetails);
          }
          if (data.settings) {
            setSettings(data.settings);
          }
        }
      }
    };
    fetchSellerDetails();
  }, []);

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

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    setOrders(orders.map(order =>
      order.id === orderId ? { ...order, status: newStatus } : order
    ));
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilter(e.target.value as OrderStatus | 'all');
  };

  const handleLogout = () => {
    localStorage.removeItem('isSellerAuthenticated');
    navigate('/seller/login');
  };

  const handleSettingsSave = async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const sellerDocRef = doc(db, 'shopOwners', currentUser.uid);
        await setDoc(sellerDocRef, { settings }, { merge: true });
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
      setSettings(prev => ({
        ...prev,
        businessHours: {
          ...prev.businessHours,
          isShopOpen: value as boolean
        }
      }));
    } else {
    setSettings(prev => ({
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
      new Date(order.timestamp).toLocaleString(),
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
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Printer className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600" />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Print Shop Dashboard</h1>
                <p className="text-xs sm:text-sm text-gray-500">QuickPrint Pro - Gitam University</p>
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
                onClick={() => setIsSettingsModalOpen(true)}
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
            <TodayOrders orders={orders} onStatusChange={handleStatusChange} />
          </div>
        )}

        {/* Reports Section */}
        {showReports && (
          <div className="mb-8">
            <RevenueReports />
          </div>
        )}

        {/* Stats */}
        <OrderStats orders={orders} />

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
          <OrderList orders={filteredOrders} onStatusChange={handleStatusChange} />
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
            <div className="flex flex-wrap space-x-2 sm:space-x-4 mb-4 sm:mb-6 border-b">
              <button
                onClick={() => setActiveSettingsTab('shop')}
                className={`pb-2 px-2 sm:px-4 text-sm sm:text-base ${
                  activeSettingsTab === 'shop'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Globe className="h-5 w-5 inline-block mr-2" />
                Shop Details
              </button>
              <button
                onClick={() => setActiveSettingsTab('notifications')}
                className={`pb-2 px-2 sm:px-4 text-sm sm:text-base ${
                  activeSettingsTab === 'notifications'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <BellRing className="h-5 w-5 inline-block mr-2" />
                Notifications
              </button>
              <button
                onClick={() => setActiveSettingsTab('hours')}
                className={`pb-2 px-2 sm:px-4 text-sm sm:text-base ${
                  activeSettingsTab === 'hours'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Clock className="h-5 w-5 inline-block mr-2" />
                Business Hours
              </button>
              <button
                onClick={() => setActiveSettingsTab('preferences')}
                className={`pb-2 px-2 sm:px-4 text-sm sm:text-base ${
                  activeSettingsTab === 'preferences'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Shield className="h-5 w-5 inline-block mr-2" />
                Preferences
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
                      value={settings.shop.name}
                      onChange={(e) => setSettings(prev => ({
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
                      value={settings.shop.gstNumber}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        shop: { ...prev.shop, gstNumber: e.target.value }
                      }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-1.5 sm:py-2 text-sm"
                  placeholder="Enter GST number"
                  aria-label="GST number"
                />
              </div>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700">Description</label>
                <textarea
                    value={settings.shop.description}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      shop: { ...prev.shop, description: e.target.value }
                    }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-1.5 sm:py-2 text-sm"
                    rows={3}
                  placeholder="Enter shop description"
                  aria-label="Shop description"
                  />
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
                      checked={settings.notifications.newOrders}
                      onChange={(e) => setSettings(prev => ({
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
                      checked={settings.notifications.dailyReport}
                      onChange={(e) => setSettings(prev => ({
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
                      checked={settings.notifications.paymentReceived}
                      onChange={(e) => setSettings(prev => ({
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
                        checked={settings.notifications.emailNotifications}
                        onChange={(e) => setSettings(prev => ({
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
                        checked={settings.notifications.smsNotifications}
                        onChange={(e) => setSettings(prev => ({
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
                      {settings.businessHours.isShopOpen ? 'Currently Open' : 'Currently Closed'}
                    </p>
                  </div>
                  <div className="flex items-center mt-2 sm:mt-0">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.businessHours.isShopOpen}
                        onChange={(e) => setSettings(prev => ({
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
                  {Object.entries(settings.businessHours).map(([day, hours]) => {
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
                            disabled={!settings.businessHours.isShopOpen}
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
                            disabled={!dayHours.open || !settings.businessHours.isShopOpen}
                            className="border border-gray-300 rounded-md shadow-sm px-2 py-1.5 text-sm disabled:bg-gray-100"
                            aria-label={`${day} start time`}
                          />
                          <span className="text-xs sm:text-sm text-gray-500">to</span>
                          <input
                            type="time"
                            value={dayHours.end}
                            onChange={(e) => handleBusinessHoursChange(day, 'end', e.target.value)}
                            disabled={!dayHours.open || !settings.businessHours.isShopOpen}
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
                      checked={settings.preferences.autoAcceptOrders}
                      onChange={(e) => setSettings(prev => ({
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
                      checked={settings.preferences.requireCustomerConfirmation}
                      onChange={(e) => setSettings(prev => ({
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
                      value={settings.preferences.maxOrderSize}
                      onChange={(e) => setSettings(prev => ({
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
                      value={settings.preferences.minOrderAmount}
                      onChange={(e) => setSettings(prev => ({
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
                    <label className="block text-xs sm:text-sm font-medium text-gray-700">Currency</label>
                    <select
                      value={settings.preferences.currency}
                      onChange={(e) => setSettings(prev => ({
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
                      value={settings.preferences.timezone}
                      onChange={(e) => setSettings(prev => ({
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
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg w-full max-w-full sm:max-w-lg max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl font-bold">Bank Account Details</h2>
              {bankModalMode === 'view' && (
                <button
                  onClick={() => setBankModalMode('edit')}
                  className="text-blue-600 hover:text-blue-800 text-sm px-2 py-1"
                  aria-label="Edit bank details"
                >
                  Edit
                </button>
              )}
            </div>

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
                  onClick={handleBankDetailsSave}
                  className="bg-blue-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-md text-sm"
                >
                  Save
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerDashboard;
