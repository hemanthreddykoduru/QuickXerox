import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';

interface Order {
  id: string;
  userId: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  // Add more fields as per your order structure
}

const AdminOrderList = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const ordersCollectionRef = collection(db, 'orders'); // Assuming your orders are in a collection named 'orders'
        const querySnapshot = await getDocs(ordersCollectionRef);
        
        const fetchedOrders: Order[] = querySnapshot.docs.map(doc => ({
          id: doc.id,
          userId: doc.data().userId || 'N/A',
          totalAmount: doc.data().totalAmount || 0,
          status: doc.data().status || 'Unknown',
          createdAt: doc.data().createdAt?.toDate().toLocaleString() || new Date().toLocaleString(), // Convert Firestore timestamp to readable date
        }));
        setOrders(fetchedOrders);
      } catch (err: any) {
        console.error('Error fetching orders:', err);
        setError(err.message || 'Failed to fetch orders.');
        toast.error('Failed to load orders.');
      } finally {
        setIsLoading(false);
      }
    };

  fetchOrders();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-lg text-gray-700">Loading Orders...</p>
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 animate-page">
      <header className="bg-white dark:bg-gray-900 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="flex items-center space-x-2 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-lg font-medium">Back to Dashboard</span>
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">All Orders</h1>
          <div></div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
          <input
            type="text"
            placeholder="Search by Order ID, Customer ID, Status..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-4 py-2 w-full sm:w-64 transition-colors"
          />
          <button
            onClick={() => {
              if (orders.length === 0) return toast.error('No orders to export!');
              const csv = [
                ['Order ID', 'Customer ID', 'Total Amount', 'Status', 'Order Date'].join(','),
                ...orders.map(o => [o.id, o.userId, o.totalAmount, o.status, o.createdAt].join(','))
              ].join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'orders.csv';
              a.click();
              window.URL.revokeObjectURL(url);
              toast.success('Orders exported!');
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition-transform active:scale-[0.98]"
          >
            Export CSV
          </button>
        </div>
        <div className="bg-white dark:bg-gray-900 shadow-sm rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Order ID</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Customer ID</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Amount</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Order Date</th>
                  <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">
                      No orders found.
                    </td>
                  </tr>
                ) : (
                  orders
                    .filter(order => {
                      const q = search.toLowerCase();
                      return (
                        order.id.toLowerCase().includes(q) ||
                        order.userId.toLowerCase().includes(q) ||
                        order.status.toLowerCase().includes(q)
                      );
                    })
                    .map((order) => (
                      <tr key={order.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{order.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{order.userId}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">₹{order.totalAmount.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${order.status === 'completed' ? 'bg-green-100 text-green-800' : order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{order.createdAt}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => setSelectedOrder(order)}
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

        {/* Order Details Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg max-w-lg w-full p-6 shadow-2xl animate-page">
              <h3 className="text-xl font-bold mb-4">Order Details</h3>
              <div className="space-y-2">
                <div><strong>Order ID:</strong> {selectedOrder.id}</div>
                <div><strong>Customer ID:</strong> {selectedOrder.userId}</div>
                <div><strong>Total Amount:</strong> ₹{selectedOrder.totalAmount.toFixed(2)}</div>
                <div><strong>Status:</strong> {selectedOrder.status}</div>
                <div><strong>Order Date:</strong> {selectedOrder.createdAt}</div>
                {/* Add more fields as needed, e.g. files, payment, OTP */}
                {selectedOrder.otp && (
                  <div><strong>Customer OTP:</strong> {selectedOrder.otp}</div>
                )}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminOrderList; 