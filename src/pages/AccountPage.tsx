import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import AccountDetails from '../components/account/AccountDetails';
import OrderHistory from '../components/account/OrderHistory';
import EditProfileModal from '../components/account/EditProfileModal';
import { useProfile } from '../hooks/useProfile';
import { Order } from '../types';
import { toast } from 'react-hot-toast';

const AccountPage = () => {
  const navigate = useNavigate();
  const { profile, updateProfile } = useProfile();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    // Check if the user is authenticated
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }
  }, [navigate]);

  const [orders] = useState<Order[]>([
    {
      id: '1',
      customerName: 'John Doe',
      items: [
        { id: '1', fileName: 'document.pdf', copies: 2, isColor: true, pages: 5 }
      ],
      total: 25.00,
      status: 'completed',
      timestamp: '2024-03-15T10:30:00Z',
      shopId: 1,
      isPaid: true
    },
    {
      id: '2',
      customerName: 'John Doe',
      items: [
        { id: '2', fileName: 'presentation.pdf', copies: 1, isColor: false, pages: 10 }
      ],
      total: 15.00,
      status: 'processing',
      timestamp: '2024-03-14T15:45:00Z',
      shopId: 2,
      isPaid: true
    }
  ]);

  const handleProfileUpdate = (updatedProfile: typeof profile) => {
    updateProfile(updatedProfile);
    toast.success('Profile updated successfully!');
  };

  const handleBack = () => {
    navigate('/customerdashboard', { replace: true });
  };

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
            <OrderHistory orders={orders} />
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