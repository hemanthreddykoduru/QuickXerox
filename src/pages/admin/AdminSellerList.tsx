import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, documentId, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-hot-toast';
import { ArrowLeft, AlertCircle, X } from 'lucide-react';
import Skeleton from '../../components/common/Skeleton';

interface Seller {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  status: 'pending' | 'approved' | 'rejected' | 'active';
  createdAt: string;
  shopName?: string;
  ownerName?: string;
  [key: string]: any;
}

interface PayoutRequest {
  id: string;
  shopId: string;
  shopName?: string;
  amount: number;
  status: 'pending' | 'accepted' | 'paid' | 'rejected';
  requestedAt: any;
  bankDetails?: {
    accountHolderName?: string;
    accountNumber?: string;
    bankName?: string;
    ifscCode?: string;
  };
}

const AdminSellerList = () => {
  const navigate = useNavigate();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [editSeller, setEditSeller] = useState<Seller | null>(null);
  const [pendingPayouts, setPendingPayouts] = useState<Record<string, PayoutRequest[]>>({});
  const [allPayoutsByShop, setAllPayoutsByShop] = useState<Record<string, PayoutRequest[]>>({});
  const [selectedSellerPayouts, setSelectedSellerPayouts] = useState<PayoutRequest[]>([]);
  const [payoutModalTitle, setPayoutModalTitle] = useState('');
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [processingPayoutId, setProcessingPayoutId] = useState<string | null>(null);

  const handlePayoutAction = async (payoutId: string, action: 'accepted' | 'rejected' | 'paid') => {
    setProcessingPayoutId(payoutId);
    try {
      await updateDoc(doc(db, 'payoutRequests', payoutId), {
        status: action,
        ...(action === 'paid' ? { paidAt: serverTimestamp() } : {}),
        ...(action === 'accepted' ? { acceptedAt: serverTimestamp() } : {}),
        ...(action === 'rejected' ? { rejectedAt: serverTimestamp() } : {}),
      });

      // Optimistically update the modal's local list
      setSelectedSellerPayouts(prev =>
        prev.map(req => req.id === payoutId ? { ...req, status: action } : req)
      );

      const msgs = { accepted: 'Payout accepted!', rejected: 'Payout rejected.', paid: 'Payout marked as completed!' };
      toast.success(msgs[action]);
    } catch (err: any) {
      console.error('Error updating payout:', err);
      toast.error('Failed to update payout status.');
    } finally {
      setProcessingPayoutId(null);
    }
  };

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
            createdAt: data.createdAt?.toDate().toLocaleString('en-US', {
              month: '2-digit',
              day: '2-digit',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            }) || new Date().toLocaleString('en-US', {
              month: '2-digit',
              day: '2-digit',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            }),
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

    // Listen for ALL payout requests in real-time (pending + paid + rejected + accepted)
    const payoutQuery = query(
      collection(db, 'payoutRequests')
    );
    const unsubscribePayouts = onSnapshot(payoutQuery, (snapshot) => {
      const pending: Record<string, PayoutRequest[]> = {};
      const all: Record<string, PayoutRequest[]> = {};
      snapshot.forEach(d => {
        const data = d.data();
        const shopId = data.shopId as string;
        const req = { id: d.id, ...data } as PayoutRequest;
        // Group all by shopId
        if (!all[shopId]) all[shopId] = [];
        all[shopId].push(req);
        // Group pending only
        if (data.status === 'pending') {
          if (!pending[shopId]) pending[shopId] = [];
          pending[shopId].push(req);
        }
      });
      // Sort each group by requestedAt descending
      const sortDesc = (arr: PayoutRequest[]) =>
        arr.sort((a, b) => (b.requestedAt?.seconds || 0) - (a.requestedAt?.seconds || 0));
      Object.keys(all).forEach(k => sortDesc(all[k]));
      Object.keys(pending).forEach(k => sortDesc(pending[k]));
      setPendingPayouts(pending);
      setAllPayoutsByShop(all);
    });

    return () => unsubscribePayouts();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Skeleton variant="circular" width={20} height={20} />
              <Skeleton variant="text" width={150} height={24} />
            </div>
            <Skeleton variant="text" width={200} height={32} />
            <div className="w-8"></div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
            <Skeleton variant="rectangular" width="100%" height={42} className="sm:w-64" />
            <Skeleton variant="rectangular" width="100%" height={42} className="sm:w-48" />
            <Skeleton variant="rectangular" width={120} height={42} />
          </div>

          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <th key={i} className="px-6 py-3 text-left">
                        <Skeleton variant="text" width={80} height={16} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={i}>
                      <td className="px-6 py-4"><Skeleton variant="text" width={100} height={20} /></td>
                      <td className="px-6 py-4"><Skeleton variant="text" width={120} height={20} /></td>
                      <td className="px-6 py-4"><Skeleton variant="text" width={150} height={20} /></td>
                      <td className="px-6 py-4"><Skeleton variant="text" width={100} height={20} /></td>
                      <td className="px-6 py-4"><Skeleton variant="text" width={80} height={24} className="rounded-full" /></td>
                      <td className="px-6 py-4"><Skeleton variant="text" width={80} height={20} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payouts</th>
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
                      <tr key={seller.id} className={pendingPayouts[seller.id] ? 'bg-yellow-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{seller.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{seller.ownerName || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{seller.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{seller.shopName || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${seller.status === 'approved' || seller.status === 'active' || seller.status === 'pending'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                              }`}
                          >
                            {seller.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {pendingPayouts[seller.id]?.length > 0 ? (
                            <button
                              onClick={() => {
                                setSelectedSellerPayouts(pendingPayouts[seller.id]);
                                setPayoutModalTitle(`${seller.shopName || seller.ownerName || 'Seller'} — Pending Payouts`);
                                setIsPayoutModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-semibold hover:bg-orange-200 transition-colors cursor-pointer"
                            >
                              <AlertCircle className="w-3 h-3" />
                              {pendingPayouts[seller.id].length} Pending
                            </button>
                          ) : allPayoutsByShop[seller.id]?.length > 0 ? (
                            <button
                              onClick={() => {
                                setSelectedSellerPayouts(allPayoutsByShop[seller.id]);
                                setPayoutModalTitle(`${seller.shopName || seller.ownerName || 'Seller'} — Payout History`);
                                setIsPayoutModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200 transition-colors cursor-pointer"
                            >
                              📄 Payout History
                            </button>
                          ) : null}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => navigate(`/admin/sellers/${seller.id}`)}
                            className={`text-blue-600 hover:text-blue-900 ${pendingPayouts[seller.id] ? 'font-bold' : ''}`}
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

        {/* Payout Details Modal */}
        {isPayoutModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Payout Requests</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{payoutModalTitle}</p>
                </div>
                <button
                  onClick={() => setIsPayoutModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {selectedSellerPayouts.map((req, idx) => (
                  <div key={req.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-gray-500 font-medium">Request #{idx + 1}</span>
                      <span className="text-xs text-gray-400">
                        {req.requestedAt?.toDate ? req.requestedAt.toDate().toLocaleString() : 'N/A'}
                      </span>
                    </div>

                    {/* Amount */}
                    <div className="mb-3 p-3 bg-orange-50 rounded-lg border border-orange-100">
                      <p className="text-xs text-orange-500 mb-0.5">Requested Amount</p>
                      <p className="text-2xl font-bold text-orange-800">₹{req.amount?.toFixed(2)}</p>
                    </div>

                    {/* Bank Details */}
                    {req.bankDetails ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-500">Account Holder</p>
                          <p className="text-sm font-medium text-gray-900">{req.bankDetails.accountHolderName || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Account Number</p>
                          <p className="text-sm font-medium text-gray-900 font-mono">{req.bankDetails.accountNumber || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Bank Name</p>
                          <p className="text-sm font-medium text-gray-900">{req.bankDetails.bankName || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">IFSC Code</p>
                          <p className="text-sm font-medium text-gray-900 font-mono">{req.bankDetails.ifscCode || '—'}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 italic">No bank details captured with this request.</p>
                    )}

                    {/* Action Buttons */}
                    <div className="mt-4 pt-3 border-t border-gray-200">
                      {req.status === 'pending' && (
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => handlePayoutAction(req.id, 'accepted')}
                            disabled={processingPayoutId === req.id}
                            className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium transition-colors"
                          >
                            {processingPayoutId === req.id ? 'Processing...' : '✓ Accept'}
                          </button>
                          <button
                            onClick={() => handlePayoutAction(req.id, 'rejected')}
                            disabled={processingPayoutId === req.id}
                            className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium transition-colors"
                          >
                            {processingPayoutId === req.id ? 'Processing...' : '✕ Reject'}
                          </button>
                          <button
                            onClick={() => handlePayoutAction(req.id, 'paid')}
                            disabled={processingPayoutId === req.id}
                            className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
                          >
                            {processingPayoutId === req.id ? 'Processing...' : '✔ Mark Completed'}
                          </button>
                        </div>
                      )}
                      {req.status === 'accepted' && (
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Accepted — Awaiting Transfer</span>
                          <button
                            onClick={() => handlePayoutAction(req.id, 'paid')}
                            disabled={processingPayoutId === req.id}
                            className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                          >
                            {processingPayoutId === req.id ? '...' : '✔ Mark Completed'}
                          </button>
                        </div>
                      )}
                      {req.status === 'paid' && (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">✓ Completed / Paid</span>
                      )}
                      {req.status === 'rejected' && (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">✕ Rejected</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex justify-end gap-3">
                <button
                  onClick={() => setIsPayoutModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setIsPayoutModalOpen(false);
                    // Navigate to seller details where they can Mark as Paid
                    const sellerId = selectedSellerPayouts[0]?.shopId;
                    if (sellerId) navigate(`/admin/sellers/${sellerId}`);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  Go to Seller Details →
                </button>
              </div>
            </div>
          </div>
        )}

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
