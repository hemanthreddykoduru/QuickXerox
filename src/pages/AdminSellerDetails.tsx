import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Mail, Phone, MapPin, Building, Banknote, Shield, Clock, BellRing, Package, Users } from 'lucide-react';

interface SellerDetails {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  shopName?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstNumber?: string;
  description?: string;
  bankDetails?: {
    accountNumber: string;
    bankName: string;
    ifscCode: string;
    accountHolderName: string;
    branchName: string;
    accountType: string;
    mobileNumber: string;
    isVerified: boolean;
  };
  settings?: {
    shop: {
      name: string;
      address: string;
      mobile: string;
      email: string;
      description: string;
      gstNumber: string;
      ownerName: string;
    };
    notifications: {
      newOrders: boolean;
      dailyReport: boolean;
      paymentReceived: boolean;
      orderStatusUpdates: boolean;
      emailNotifications: boolean;
      smsNotifications: boolean;
    };
    businessHours: {
      isShopOpen: boolean;
      monday: { open: boolean; start: string; end: string; };
      tuesday: { open: boolean; start: string; end: string; };
      wednesday: { open: boolean; start: string; end: string; };
      thursday: { open: boolean; start: string; end: string; };
      friday: { open: boolean; start: string; end: string; };
      saturday: { open: boolean; start: string; end: string; };
      sunday: { open: boolean; start: string; end: string; };
    };
    preferences: {
      autoAcceptOrders: boolean;
      requireCustomerConfirmation: boolean;
      allowPreOrders: boolean;
      maxOrderSize: number;
      minOrderAmount: number;
      currency: string;
      timezone: string;
    };
  };
}

const AdminSellerDetails = () => {
  const { sellerId } = useParams<{ sellerId: string }>();
  const navigate = useNavigate();
  const [seller, setSeller] = useState<SellerDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSeller = async () => {
      if (!sellerId) {
        setError('Seller ID not provided.');
        setIsLoading(false);
        return;
      }

      try {
        const sellerDocRef = doc(db, 'shopOwners', sellerId);
        const docSnap = await getDoc(sellerDocRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setSeller({
            id: docSnap.id,
            name: data.settings?.shop?.name || data.name || 'N/A',
            email: data.settings?.shop?.email || data.email || 'N/A',
            mobile: data.mobile || data.settings?.shop?.mobile || 'N/A',
            status: data.status || 'pending',
            createdAt: data.createdAt?.toDate().toLocaleString() || 'N/A',
            shopName: data.settings?.shop?.name || 'N/A',
            address: data.settings?.shop?.address || data.address || 'N/A',
            city: data.city || 'N/A',
            state: data.state || 'N/A',
            pincode: data.pincode || 'N/A',
            gstNumber: data.settings?.shop?.gstNumber || 'N/A',
            description: data.settings?.shop?.description || 'N/A',
            bankDetails: data.bankDetails || {},
            settings: data.settings || {},
          } as SellerDetails);
        } else {
          setError('No such seller found.');
          toast.error('Seller not found.');
        }
      } catch (err: any) {
        console.error('Error fetching seller details:', err);
        setError(err.message || 'Failed to load seller details.');
        toast.error('Failed to load seller details.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSeller();
  }, [sellerId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-lg text-gray-700">Loading Seller Details...</p>
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

  if (!seller) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-lg text-gray-700">Seller not found or not loaded.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/admin/sellers')}
            className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-lg font-medium">Back to Sellers</span>
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{seller.shopName || seller.name} Details</h1>
          <div></div> {/* For spacing */}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="bg-white shadow-sm rounded-lg p-6 space-y-6">
          {/* General Information */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">General Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailItem icon={<Package className="text-blue-500" />} label="Shop Name" value={seller.shopName} />
              <DetailItem icon={<Mail className="text-blue-500" />} label="Email" value={seller.email} />
              <DetailItem icon={<Phone className="text-blue-500" />} label="Mobile" value={seller.mobile} />
              <DetailItem icon={<Users className="text-blue-500" />} label="Contact Person" value={seller.settings?.shop?.ownerName} />
              <DetailItem icon={<MapPin className="text-blue-500" />} label="Address" value={seller.address} />
              <DetailItem icon={<MapPin className="text-blue-500" />} label="City" value={seller.city} />
              <DetailItem icon={<MapPin className="text-blue-500" />} label="State" value={seller.state} />
              <DetailItem icon={<MapPin className="text-blue-500" />} label="Pincode" value={seller.pincode} />
              <DetailItem icon={<Shield className="text-blue-500" />} label="GST Number" value={seller.gstNumber} />
              <DetailItem label="Description" value={seller.description} fullWidth={true} />
              <DetailItem label="Status" value={seller.status} />
              <DetailItem label="Registered On" value={seller.createdAt} />
            </div>
          </section>

          {/* Bank Account Details */}
          {seller.bankDetails && (
            <section className="border-t pt-6 mt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Bank Account Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DetailItem icon={<Banknote className="text-green-500" />} label="Account Holder" value={seller.bankDetails.accountHolderName} />
                <DetailItem icon={<Mail className="text-green-500" />} label="Bank Mobile" value={seller.bankDetails.mobileNumber} />
                <DetailItem icon={<Banknote className="text-green-500" />} label="Account Number" value={seller.bankDetails.accountNumber} />
                <DetailItem icon={<Building className="text-green-500" />} label="Bank Name" value={seller.bankDetails.bankName} />
                <DetailItem icon={<Building className="text-green-500" />} label="Branch Name" value={seller.bankDetails.branchName} />
                <DetailItem icon={<Banknote className="text-green-500" />} label="IFSC Code" value={seller.bankDetails.ifscCode} />
                <DetailItem label="Account Type" value={seller.bankDetails.accountType} />
                <DetailItem label="Verified" value={seller.bankDetails.isVerified ? 'Yes' : 'No'} />
              </div>
            </section>
          )}

          {/* Settings Overview */}
          {seller.settings && (
            <section className="border-t pt-6 mt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Settings Overview</h2>

              {/* Shop Details from Settings */}
              {seller.settings.shop && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Shop Details (from Settings)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DetailItem icon={<Package className="text-purple-500" />} label="Shop Name (Settings)" value={seller.settings.shop.name} />
                    <DetailItem icon={<Mail className="text-purple-500" />} label="Shop Email (Settings)" value={seller.settings.shop.email} />
                    <DetailItem icon={<Phone className="text-purple-500" />} label="Shop Mobile (Settings)" value={seller.settings.shop.mobile} />
                    <DetailItem icon={<MapPin className="text-purple-500" />} label="Shop Address (Settings)" value={seller.settings.shop.address} />
                    <DetailItem icon={<Shield className="text-purple-500" />} label="GST Number (Settings)" value={seller.settings.shop.gstNumber} />
                    <DetailItem label="Shop Description (Settings)" value={seller.settings.shop.description} fullWidth={true} />
                  </div>
                </div>
              )}

              {/* Notifications from Settings */}
              {seller.settings.notifications && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Notification Preferences</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DetailItem icon={<BellRing className="text-orange-500" />} label="New Orders" value={seller.settings.notifications.newOrders ? 'Enabled' : 'Disabled'} />
                    <DetailItem icon={<BellRing className="text-orange-500" />} label="Daily Report" value={seller.settings.notifications.dailyReport ? 'Enabled' : 'Disabled'} />
                    <DetailItem icon={<BellRing className="text-orange-500" />} label="Payment Received" value={seller.settings.notifications.paymentReceived ? 'Enabled' : 'Disabled'} />
                    <DetailItem icon={<BellRing className="text-orange-500" />} label="Order Status Updates" value={seller.settings.notifications.orderStatusUpdates ? 'Enabled' : 'Disabled'} />
                    <DetailItem label="Email Notifications" value={seller.settings.notifications.emailNotifications ? 'Enabled' : 'Disabled'} />
                    <DetailItem label="SMS Notifications" value={seller.settings.notifications.smsNotifications ? 'Enabled' : 'Disabled'} />
                  </div>
                </div>
              )}

              {/* Business Hours from Settings */}
              {seller.settings.businessHours && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Business Hours</h3>
                  <DetailItem label="Shop Open Status" value={seller.settings.businessHours.isShopOpen ? 'Open' : 'Closed'} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    {Object.entries(seller.settings.businessHours).map(([day, hours]) => {
                      if (day === 'isShopOpen') return null;
                      const dayHours = hours as { open: boolean; start: string; end: string; };
                      return (
                        <DetailItem 
                          key={day} 
                          label={day.charAt(0).toUpperCase() + day.slice(1)} 
                          value={dayHours.open ? `${dayHours.start} - ${dayHours.end}` : 'Closed'} 
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Preferences from Settings */}
              {seller.settings.preferences && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Preferences</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DetailItem icon={<Shield className="text-gray-500" />} label="Auto-accept Orders" value={seller.settings.preferences.autoAcceptOrders ? 'Yes' : 'No'} />
                    <DetailItem icon={<Shield className="text-gray-500" />} label="Require Customer Confirmation" value={seller.settings.preferences.requireCustomerConfirmation ? 'Yes' : 'No'} />
                    <DetailItem icon={<Package className="text-gray-500" />} label="Max Order Size" value={seller.settings.preferences.maxOrderSize} />
                    <DetailItem icon={<Banknote className="text-gray-500" />} label="Min Order Amount" value={`₹${seller.settings.preferences.minOrderAmount}`} />
                    <DetailItem label="Currency" value={seller.settings.preferences.currency} />
                    <DetailItem label="Timezone" value={seller.settings.preferences.timezone} />
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
};

// Helper component for consistent detail item display
const DetailItem = ({ icon, label, value, fullWidth = false }: {
  icon?: React.ReactNode;
  label: string;
  value: string | number | boolean | undefined;
  fullWidth?: boolean;
}) => {
  if (value === undefined || value === null || value === '') {
    value = 'N/A';
  }
  return (
    <div className={`flex items-start space-x-3 ${fullWidth ? 'md:col-span-2' : ''}`}>
      {icon && <div className="flex-shrink-0 mt-0.5">{icon}</div>}
      <div>
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className="text-sm text-gray-900 break-words">{String(value)}</p>
      </div>
    </div>
  );
};

export default AdminSellerDetails; 