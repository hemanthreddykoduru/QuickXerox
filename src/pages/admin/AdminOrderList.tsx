import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Search, Download } from 'lucide-react';

interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  shopId: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  timestampMs: number;
  paymentId?: string;
}

const AdminOrderList = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [search, setSearch] = useState("");
  const [sortOption, setSortOption] = useState("newest");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const ordersCollectionRef = collection(db, 'orders');
        const querySnapshot = await getDocs(ordersCollectionRef);

        const fetchedOrders: Order[] = querySnapshot.docs.map(doc => {
          const data = doc.data();
          let tsMs = Date.now();
          if (data.timestamp) {
            tsMs = new Date(data.timestamp).getTime();
          } else if (data.createdAt?.toDate) {
            tsMs = data.createdAt.toDate().getTime();
          }

          const formattedDate = new Date(tsMs).toLocaleString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          });

          return {
            id: doc.id,
            customerId: data.userId || data.customerId || 'N/A',
            customerName: data.customerName || 'N/A',
            customerEmail: data.customerEmail || 'N/A',
            shopId: data.shopId || 'N/A',
            totalAmount: data.total || data.totalAmount || 0,
            status: data.status || 'Unknown',
            paymentId: data.paymentId || 'N/A',
            createdAt: formattedDate,
            timestampMs: tsMs,
          };
        });
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

  const filteredOrders = orders.filter(order => {
    // 1. Text Search
    const q = search.toLowerCase();
    const matchesSearch =
      order.id.toLowerCase().includes(q) ||
      order.customerName.toLowerCase().includes(q) ||
      order.customerEmail.toLowerCase().includes(q) ||
      order.status.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    // 2. Status Filter
    if (statusFilter !== 'all' && order.status.toLowerCase() !== statusFilter) {
      return false;
    }

    // 3. Date Range Filter
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    if (dateFilter === 'today') {
      if (now - order.timestampMs > oneDay) return false;
    } else if (dateFilter === 'week') {
      if (now - order.timestampMs > 7 * oneDay) return false;
    } else if (dateFilter === 'month') {
      if (now - order.timestampMs > 30 * oneDay) return false;
    }

    return true;
  }).sort((a, b) => {
    switch (sortOption) {
      case 'newest':
        return b.timestampMs - a.timestampMs;
      case 'oldest':
        return a.timestampMs - b.timestampMs;
      case 'priceDesc':
        return b.totalAmount - a.totalAmount;
      case 'priceAsc':
        return a.totalAmount - b.totalAmount;
      default:
        return b.timestampMs - a.timestampMs;
    }
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    // Reset to page 1 if filters change
    setCurrentPage(1);
  }, [search, sortOption, statusFilter, dateFilter]);

  const exportCSV = () => {
    if (orders.length === 0) return toast.error('No orders to export!');
    const csv = [
      ['Order ID', 'Customer Name', 'Customer Email', 'Shop ID', 'Total Amount', 'Status', 'Payment ID', 'Order Date'].join(','),
      ...orders.map(o => [o.id, o.customerName, o.customerEmail, o.shopId, o.totalAmount, o.status, o.paymentId || 'N/A', o.createdAt].join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orders.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Orders exported!');
  };

  const updateOrderStatus = async (newStatus: string) => {
    if (!selectedOrder) return;
    setIsUpdatingStatus(true);
    try {
      const orderRef = doc(db, 'orders', selectedOrder.id);
      await updateDoc(orderRef, { status: newStatus });

      // Update local state to reflect change instantly without full refetch
      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, status: newStatus } : o));
      setSelectedOrder({ ...selectedOrder, status: newStatus });
      toast.success(`Order status updated to ${newStatus}`);
    } catch (err: any) {
      console.error('Error updating order status:', err);
      toast.error('Failed to update status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="flex items-center space-x-2 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="hidden sm:inline text-lg font-medium">Back to Dashboard</span>
              <span className="sm:hidden text-sm font-medium">Back</span>
            </button>
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-gray-100">All Orders</h1>
            <div className="w-16 sm:w-20"></div> {/* Spacer for centering */}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Search, Sort, Filters, and Export */}
        <div className="flex flex-col mb-4 gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search orders..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Any Status</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="paid">Paid</option>
                <option value="cancelled">Cancelled</option>
                <option value="refunded">Refunded</option>
              </select>

              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Past 7 Days</option>
                <option value="month">Past 30 Days</option>
              </select>

              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="newest">Sort: Newest First</option>
                <option value="oldest">Sort: Oldest First</option>
                <option value="priceDesc">Price: High to Low</option>
                <option value="priceAsc">Price: Low to High</option>
              </select>
              <button
                onClick={exportCSV}
                className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition-colors"
                title="Export Filtered CSV"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Table View (hidden on mobile) */}
        <div className="hidden md:block bg-white dark:bg-gray-900 shadow-sm rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Order ID</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Customer Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Shop ID</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Amount</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Order Date</th>
                  <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                {paginatedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      No orders found matching filters.
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{order.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{order.customerName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{order.customerEmail}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{order.shopId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">₹{order.totalAmount.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${order.status === 'completed' || order.status === 'paid' ? 'bg-green-100 text-green-800' : order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
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

        {/* Mobile Card View (hidden on desktop) */}
        <div className="md:hidden space-y-4">
          {paginatedOrders.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-lg p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">No orders found matching filters.</p>
            </div>
          ) : (
            paginatedOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-4 space-y-3"
              >
                {/* Order ID and Status */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Order ID</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{order.id}</p>
                  </div>
                  <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${order.status === 'completed' || order.status === 'paid' ? 'bg-green-100 text-green-800' :
                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                    {order.status}
                  </span>
                </div>

                {/* Customer Info */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Customer</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{order.customerName}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{order.customerEmail}</p>
                </div>

                {/* Amount and Date */}
                <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-3">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Amount</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">₹{order.totalAmount.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Order Date</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{order.createdAt}</p>
                  </div>
                </div>

                {/* View Details Button */}
                <button
                  onClick={() => setSelectedOrder(order)}
                  className="w-full mt-2 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  View Details
                </button>
              </div>
            ))
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-gray-900 p-4 rounded-lg shadow-sm">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Showing <span className="font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-semibold">{Math.min(currentPage * itemsPerPage, filteredOrders.length)}</span> of <span className="font-semibold">{filteredOrders.length}</span> orders
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 dark:border-gray-700 rounded-md disabled:opacity-50 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 dark:border-gray-700 rounded-md disabled:opacity-50 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Order Details Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
              <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Order Details</h3>
              <div className="space-y-3">
                <div className="pb-2 border-b border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Order ID</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedOrder.id}</p>
                </div>
                <div className="pb-2 border-b border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Invoice No</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 font-mono">INV-{selectedOrder.id}</p>
                </div>
                <div className="pb-2 border-b border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Payment ID</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 font-mono tracking-wide">{selectedOrder.paymentId || 'N/A'}</p>
                </div>
                <div className="pb-2 border-b border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Customer Name</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedOrder.customerName}</p>
                </div>
                <div className="pb-2 border-b border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Customer Email</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedOrder.customerEmail}</p>
                </div>
                <div className="pb-2 border-b border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Amount</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">₹{selectedOrder.totalAmount.toFixed(2)}</p>
                </div>
                <div className="pb-2 border-b border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Status</p>
                  <select
                    value={selectedOrder.status}
                    onChange={(e) => updateOrderStatus(e.target.value)}
                    disabled={isUpdatingStatus}
                    className={`block w-full sm:w-auto px-3 py-1.5 text-sm font-semibold rounded-lg border focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors ${selectedOrder.status === 'completed' || selectedOrder.status === 'paid' ? 'bg-green-50 text-green-800 border-green-200 dark:bg-green-900/30 dark:border-green-800' :
                      selectedOrder.status === 'pending' ? 'bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:border-yellow-800' :
                        'bg-gray-50 text-gray-800 border-gray-200 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200'
                      }`}
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                    <option value="paid">Paid</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Order Date</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedOrder.createdAt}</p>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
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