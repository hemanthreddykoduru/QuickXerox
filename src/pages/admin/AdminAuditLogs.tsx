import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Download, Filter, ChevronRight, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { db } from '../../firebase';
import { collection, query, orderBy, limit, getDocs, startAfter, where, QueryConstraint } from 'firebase/firestore';
import Skeleton from '../../components/common/Skeleton';

interface AuditLog {
    id: string;
    timestamp: Date;
    adminEmail: string;
    action: string;
    details: string;
}

const ROWS_PER_PAGE = 20;

const AdminAuditLogs = () => {
    const navigate = useNavigate();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastVisible, setLastVisible] = useState<any>(null);
    const [page, setPage] = useState(1);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [actionFilter, setActionFilter] = useState('All');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [uniqueActions, setUniqueActions] = useState<string[]>(['All']);

    useEffect(() => {
        fetchLogs();
        fetchUniqueActions();
    }, []); // Initial load

    useEffect(() => {
        // When filters change, reset to page 1 and fetch
        setPage(1);
        setLastVisible(null);
        fetchLogs(true);
    }, [searchTerm, actionFilter, startDate, endDate]);

    const fetchUniqueActions = async () => {
        // In a real app with many logs, getting distinct values might require a specific aggregation query or hardcoded list.
        // For now, we'll hardcode common actions + dynamic fetch if possible, or just stick to a known list.
        // Let's use a predefined list for better UX immediately, plus we can add to it if we see new ones.
        const commonActions = [
            'All',
            'ADMIN_LOGIN',
            'UPDATE_SETTINGS',
            'APPROVE_SHOP',
            'REJECT_SHOP',
            'DELETE_USER',
            'EXPORT_DATA',
            'IMPERSONATE_USER',
            'INVITE_SELLER'
        ];
        setUniqueActions(commonActions);
    };

    const getFilterConstraints = () => {
        const constraints: QueryConstraint[] = [];

        if (actionFilter !== 'All') {
            constraints.push(where('action', '==', actionFilter));
        }

        if (startDate) {
            constraints.push(where('timestamp', '>=', new Date(startDate)));
        }

        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            constraints.push(where('timestamp', '<=', end));
        }

        // Note: Firestore doesn't support multiple range filters on different fields easily with 'orderBy' 
        // without composite indexes. If we filter by 'action' (equality) and 'timestamp' (range), we need an index.
        // Text search (searchTerm) is done client-side for this simple implementation 
        // because Firestore doesn't support full-text search natively without extensions like Algolia.
        // For scalable search, we'd need a third-party service. 
        // Here we will fetch a batch and filter in memory if the dataset isn't huge, 
        // OR we relies on the limits. 
        // HOWEVER, mixing 'where' and 'orderBy' needs care.

        return constraints;
    };

    const fetchLogs = async (isReset = false) => {
        setLoading(true);
        try {
            // Base reference
            const logsRef = collection(db, 'auditLogs');
            const constraints = getFilterConstraints();

            // We always want to order by timestamp desc
            constraints.push(orderBy('timestamp', 'desc'));

            // If existing pagination (next page)
            if (!isReset && lastVisible && page > 1) { // Logic for next page would be handled in handleNext/Prev
                // This hook handles initial and filter changes. 
                // Pagination is handled by specific functions using state.
            }

            // For the basic "fetch", let's just get the first page with current filters
            constraints.push(limit(ROWS_PER_PAGE));

            const q = query(logsRef, ...constraints);
            const snapshot = await getDocs(q);

            const fetchedLogs: AuditLog[] = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    timestamp: data.timestamp?.toDate() || new Date(),
                    adminEmail: data.adminEmail || 'Unknown',
                    action: data.action || 'Unknown',
                    details: data.details || '',
                };
            });

            // Client-side text filtering for search term if provided
            // (Note: effective only on the current page's fetched results if not using Algolia)
            // To improve this without Algolia, we might just warn user search is limited.
            // Or we filter AFTER fetching, which might result in < ROWS_PER_PAGE items.

            let finalLogs = fetchedLogs;
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                finalLogs = finalLogs.filter(log =>
                    log.adminEmail.toLowerCase().includes(term) ||
                    log.details.toLowerCase().includes(term) ||
                    log.action.toLowerCase().includes(term)
                );
            }

            setLogs(finalLogs);
            setLastVisible(snapshot.docs[snapshot.docs.length - 1]);

            // Count total (approx or exact if small) - strictly optional for performance
            // const countSnapshot = await getCountFromServer(query(logsRef, ...getFilterConstraints()));
            // setTotalLogs(countSnapshot.data().count);

        } catch (error: any) {
            console.error('Error fetching logs:', error);
            // specific error regarding index
            if (error.message.includes('requires an index')) {
                toast.error('Filtering requires a specific index. Please ask developer to create it.');
            } else {
                toast.error('Failed to load audit logs.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleNextPage = async () => {
        if (!lastVisible) return;
        setLoading(true);
        try {
            const logsRef = collection(db, 'auditLogs');
            const constraints = getFilterConstraints();
            constraints.push(orderBy('timestamp', 'desc'));
            constraints.push(startAfter(lastVisible));
            constraints.push(limit(ROWS_PER_PAGE));

            const q = query(logsRef, ...constraints);
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                const fetchedLogs: AuditLog[] = snapshot.docs.map(doc => ({
                    id: doc.id,
                    timestamp: doc.data().timestamp?.toDate() || new Date(),
                    adminEmail: doc.data().adminEmail || 'Unknown',
                    action: doc.data().action || 'Unknown',
                    details: doc.data().details || '',
                }));

                // Apply client side search if needed
                let finalLogs = fetchedLogs;
                if (searchTerm) {
                    const term = searchTerm.toLowerCase();
                    finalLogs = finalLogs.filter(log =>
                        log.adminEmail.toLowerCase().includes(term) ||
                        log.details.toLowerCase().includes(term)
                    );
                }

                setLogs(finalLogs);
                setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
                setPage(p => p + 1);
            } else {
                toast('No more logs available.');
            }
        } catch (error) {
            console.error('Error next page:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExportCSV = () => {
        if (logs.length === 0) {
            toast.error('No logs to export');
            return;
        }

        // Header
        const headers = ['Timestamp', 'Admin Email', 'Action', 'Details'];
        const csvContent = [
            headers.join(','),
            ...logs.map(log => {
                return [
                    `"${log.timestamp.toLocaleString()}"`,
                    `"${log.adminEmail}"`,
                    `"${log.action}"`,
                    `"${log.details.replace(/"/g, '""')}"` // Escape quotes
                ].join(',');
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `audit_logs_${new Date().toISOString()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => navigate('/admin/dashboard')}
                            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5 text-gray-600" />
                        </button>
                        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
                    </div>
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        <Download className="h-4 w-4" />
                        Export CSV
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-up">
                {/* Filters Panel */}
                <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
                    <div className="flex flex-col md:flex-row gap-4 items-end md:items-center justify-between">
                        <div className="flex flex-col md:flex-row gap-4 w-full">
                            {/* Search */}
                            <div className="relative flex-1">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Search Details</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Search admin, action or details..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                </div>
                            </div>

                            {/* Action Filter */}
                            <div className="w-full md:w-48">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Action Type</label>
                                <div className="relative">
                                    <select
                                        value={actionFilter}
                                        onChange={(e) => setActionFilter(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg appearance-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {uniqueActions.map(action => (
                                            <option key={action} value={action}>{action}</option>
                                        ))}
                                    </select>
                                    <Filter className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                </div>
                            </div>

                            {/* Date Range */}
                            <div className="flex gap-2 w-full md:w-auto">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Reset */}
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setActionFilter('All');
                                setStartDate('');
                                setEndDate('');
                            }}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                            title="Reset Filters"
                        >
                            <RefreshCw className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {loading ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <tr key={i} className="border-b border-gray-100 last:border-b-0 animate-pulse">
                                            <td className="px-6 py-4"><Skeleton width="80%" height={20} /></td>
                                            <td className="px-6 py-4"><Skeleton width="100%" height={20} /></td>
                                            <td className="px-6 py-4"><Skeleton width={100} height={20} /></td>
                                            <td className="px-6 py-4"><Skeleton width="100%" height={20} /></td>
                                        </tr>
                                    ))
                                ) : logs.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                            No audit logs found matching your criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map((log) => (
                                        <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {log.timestamp.toLocaleString('en-US', {
                                                    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
                                                })}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {log.adminEmail}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${log.action.includes('DELETE') ? 'bg-red-100 text-red-800' :
                                                    log.action.includes('UPDATE') ? 'bg-blue-100 text-blue-800' :
                                                        log.action.includes('APPROVE') ? 'bg-green-100 text-green-800' :
                                                            'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 max-w-md truncate" title={log.details}>
                                                {log.details}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-700">
                                    Showing page <span className="font-medium">{page}</span>
                                </p>
                            </div>
                            <div>
                                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                    <button
                                        onClick={() => {
                                            // For simplicity in this implementation, Prev behaves as Reset to Page 1
                                            // Real Prev requires history stack of cursors or limitToLast
                                            setPage(1);
                                            setLastVisible(null);
                                            fetchLogs(true);
                                        }}
                                        disabled={page === 1 || loading}
                                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <span className="sr-only">First</span>
                                        <span className="px-2">First</span>
                                    </button>
                                    <button
                                        onClick={handleNextPage}
                                        disabled={loading || logs.length < ROWS_PER_PAGE}
                                        className="relative inline-flex items-center px-4 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <span>Next</span>
                                        <ChevronRight className="h-5 w-5" />
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminAuditLogs;
