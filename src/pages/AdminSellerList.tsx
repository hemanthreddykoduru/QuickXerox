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
}

const AdminSellerList = () => {
  const navigate = useNavigate();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSellers = async () => {
      try {
        const sellersCollectionRef = collection(db, 'shopOwners');
        // Exclude specific admin user ID if it's erroneously in shopOwners
        const q = query(sellersCollectionRef, where(documentId(), '!=', 'bEd6Hz5mX0Vm6lgLu5A7Ak2sEfX2'));
        const querySnapshot = await getDocs(q);
        
        const fetchedSellers: Seller[] = querySnapshot.docs.map(doc => {
          const data = doc.data();
          console.log('Raw seller document data:', data);
          return {
            id: doc.id,
            name: data.settings?.shop?.name || data.name || 'N/A',
            email: data.settings?.shop?.email || data.email || 'N/A',
            mobile: data.mobile || '',
            status: data.status || 'pending',
            createdAt: data.createdAt?.toDate().toLocaleString() || new Date().toLocaleString(),
            shopName: data.settings?.shop?.name || 'N/A',
            ownerName: data.settings?.shop?.ownerName || 'N/A',
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
          <div></div> {/* For spacing */}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seller ID</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shop Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sellers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      No sellers found.
                    </td>
                  </tr>
                ) : (
                  sellers.map((seller) => (
                    <tr key={seller.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{seller.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{seller.ownerName || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{seller.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{seller.shopName || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${seller.status === 'approved' ? 'bg-green-100 text-green-800' : seller.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
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
      </main>
    </div>
  );
};

export default AdminSellerList; 