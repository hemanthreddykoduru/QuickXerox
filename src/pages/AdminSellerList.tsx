import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, documentId } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';

interface Seller {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  shopName?: string;
  ownerName?: string;
  [key: string]: any; // allow dynamic fields
}

const AdminSellerList = () => {
  const navigate = useNavigate();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<'all'|'pending'|'approved'|'rejected'>('all');
  const [editSeller, setEditSeller] = useState<Seller | null>(null);

  useEffect(() => {
    const fetchSellers = async () => {
      try {
        const sellersCollectionRef = collection(db, 'shopOwners');
        const q = query(sellersCollectionRef, where(documentId(), '!=', 'bEd6Hz5mX0Vm6lgLu5A7Ak2sEfX2'));
        const querySnapshot = await getDocs(q);

        const fetchedSellers: Seller[] = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.settings?.shop?.name || data.name || 'N/A',
            email: data.settings?.shop?.email || data.email || 'N/A',
            mobile: data.mobile || '',
            status: data.status || 'pending',
            createdAt: data.createdAt?.toDate().toLocaleString() || new Date().toLocaleString(),
            shopName: data.settings?.shop?.name || 'N/A',
            ownerName: data.settings?.shop?.ownerName || 'N/A',
            ...data, // include all raw fields
          };
        });
        setSellers(fetchedSellers);
      } catch (err: any) {
        console.error('Error fetching sellers:', err);
        setError(err.message || 'Failed to fetch sellers.');
        toast.error('Failed to load sellers.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSellers();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-lg text-gray-700">Loading Sellers...</p>
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
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-lg font-medium">Back to Dashboard</span>
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Registered Sellers</h1>
          <div></div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
          <input
            type="text"
            placeholder="Search by Seller ID, Owner Name, Email, Shop Name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 w-full sm:w-64"
          />
          <select
            value={filter}
            onChange={e => setFilter(e.target.value as any)}
            className="border border-gray-300 rounded-lg px-4 py-2 w-full sm:w-48"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <button
            onClick={() => {
              if (sellers.length === 0) return toast.error('No sellers to export!');

              // Collect all keys across sellers
              const allKeys = Array.from(new Set(sellers.flatMap(s => Object.keys(s))));
              const csvHeaders = allKeys.join(',');

              const csvRows = sellers.map(seller =>
                allKeys.map(key => `"${String(seller[key] ?? '').replace(/"/g, '""')}"`).join(',')
              );

              const csvContent = [csvHeaders, ...csvRows].join('\n');

              const blob = new Blob([csvContent], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'sellers.csv';
              a.click();
              window.URL.revokeObjectURL(url);

              toast.success('Sellers exported!');
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700"
          >
            Export CSV
          </button>
        </div>

        {/* Table */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seller ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shop Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sellers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-sm text-gray-500 text-center">
                      No sellers found.
                    </td>
                  </tr>
                ) : (
                  sellers
                    .filter(seller => {
                      const q = search.toLowerCase();
                      const statusMatch = filter === 'all' || seller.status === filter;
                      return (
                        statusMatch &&
                        (seller.id.toLowerCase().includes(q) ||
                          seller.ownerName?.toLowerCase().includes(q) ||
                          seller.email.toLowerCase().includes(q) ||
                          seller.shopName?.toLowerCase().includes(q))
                      );
                    })
                    .map(seller => (
                      <tr key={seller.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{seller.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{seller.ownerName || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{seller.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{seller.shopName || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              seller.status === 'approved'
                                ? 'bg-green-100 text-green-800'
                                : seller.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {seller.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => navigate(`/admin/sellers/${seller.id}`)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit Seller Modal */}
        {editSeller && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-2xl">
              <h3 className="text-xl font-bold mb-4">Edit Seller</h3>
              <form
                onSubmit={e => {
                  e.preventDefault();
                  // TODO: Update Firestore with new details
                  setEditSeller(null);
                  toast.success('Seller details updated!');
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700">Owner Name</label>
                  <input
                    type="text"
                    value={editSeller.ownerName}
                    onChange={e => setEditSeller({ ...editSeller, ownerName: e.target.value })}
                    className="border border-gray-300 rounded-lg px-4 py-2 w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Shop Name</label>
                  <input
                    type="text"
                    value={editSeller.shopName}
                    onChange={e => setEditSeller({ ...editSeller, shopName: e.target.value })}
                    className="border border-gray-300 rounded-lg px-4 py-2 w-full"
                  />
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button
                    type="button"
                    onClick={() => setEditSeller(null)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminSellerList;
