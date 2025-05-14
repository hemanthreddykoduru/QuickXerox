import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer, DollarSign, Bell, Settings, LogOut, BarChart } from 'lucide-react';

import OrderList from '../components/seller/OrderList';
import OrderStats from '../components/seller/OrderStats';
import { Order, OrderStatus } from '../types';

const SellerDashboard: React.FC = () => {
  const navigate = useNavigate();
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
  const [isBankModalOpen, setIsBankModalOpen] = useState(false); // NEW STATE

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    setOrders(orders.map(order =>
      order.id === orderId ? { ...order, status: newStatus } : order
    ));
  };

  const handleLogout = () => {
    localStorage.removeItem('isSellerAuthenticated');
    navigate('/seller/login');
  };

  const handleSettingsSave = () => {
    alert('Seller details updated successfully!');
    setIsSettingsModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Printer className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Print Shop Dashboard</h1>
                <p className="text-sm text-gray-500">QuickPrint Pro - Gitam University</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="relative p-2 text-gray-400 hover:text-gray-500">
                <Bell className="h-6 w-6" />
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white" />
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-500">
                <Settings className="h-6 w-6" onClick={() => setIsSettingsModalOpen(true)} />
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <button
            onClick={() => setIsBankModalOpen(true)}
            className="flex items-center justify-center space-x-2 p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <DollarSign className="h-6 w-6 text-green-600" />
            <span className="font-medium text-gray-900">Bank Account</span>
          </button>
          <button className="flex items-center justify-center space-x-2 p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <Settings className="h-6 w-6 text-blue-600" />
            <span className="font-medium text-gray-900">Today Orders</span>
          </button>
          <button className="flex items-center justify-center space-x-2 p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <BarChart className="h-6 w-6 text-blue-600" />
            <span className="font-medium text-gray-900">View Reports</span>
          </button>
        </div>

        {/* Stats */}
        <OrderStats orders={orders} />

        {/* Orders */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Recent Orders</h2>
            <div className="flex space-x-2">
              <select className="border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>All Orders</option>
                <option>Pending</option>
                <option>Processing</option>
                <option>Completed</option>
              </select>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
                Export
              </button>
            </div>
          </div>
          <OrderList orders={orders} onStatusChange={handleStatusChange} />
        </div>
      </main>

      {/* Settings Modal */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">Seller Details</h2>
            <form>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={sellerDetails.name}
                  onChange={(e) => setSellerDetails({ ...sellerDetails, name: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <textarea
                  value={sellerDetails.address}
                  onChange={(e) => setSellerDetails({ ...sellerDetails, address: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2"
                ></textarea>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Mobile</label>
                <input
                  type="text"
                  value={sellerDetails.mobile}
                  onChange={(e) => setSellerDetails({ ...sellerDetails, mobile: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={sellerDetails.email}
                  onChange={(e) => setSellerDetails({ ...sellerDetails, email: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2"
                />
              </div>
            </form>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleSettingsSave}
                className="bg-blue-600 text-white px-4 py-2 rounded-md"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bank Account Modal */}
      {isBankModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">Bank Account Details</h2>
            <form>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Account Number</label>
                <input
                  type="text"
                  value={sellerDetails.bankDetails.accountNumber}
                  onChange={(e) =>
                    setSellerDetails({
                      ...sellerDetails,
                      bankDetails: {
                        ...sellerDetails.bankDetails,
                        accountNumber: e.target.value,
                      },
                    })
                  }
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Bank Name</label>
                <input
                  type="text"
                  value={sellerDetails.bankDetails.bankName}
                  onChange={(e) =>
                    setSellerDetails({
                      ...sellerDetails,
                      bankDetails: {
                        ...sellerDetails.bankDetails,
                        bankName: e.target.value,
                      },
                    })
                  }
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">IFSC Code</label>
                <input
                  type="text"
                  value={sellerDetails.bankDetails.ifscCode}
                  onChange={(e) =>
                    setSellerDetails({
                      ...sellerDetails,
                      bankDetails: {
                        ...sellerDetails.bankDetails,
                        ifscCode: e.target.value,
                      },
                    })
                  }
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2"
                />
              </div>
            </form>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setIsBankModalOpen(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  alert('Bank details updated successfully!');
                  setIsBankModalOpen(false);
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-md"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerDashboard;
