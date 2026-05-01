import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Plus, Edit2, Trash2, Tag, Percent, X, History, User, Receipt, Clock } from 'lucide-react';
import { Coupon } from '../../types';

interface UsageLog {
    id: string;
    userId: string;
    orderId: string;
    discountAmount: number;
    timestamp: any;
}

const AdminCoupons = () => {
    const navigate = useNavigate();
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formData, setFormData] = useState<Partial<Coupon>>({
        code: '',
        discountType: 'flat',
        discountValue: 0,
        minOrderAmount: 0,
        maxDiscount: 0,
        usageLimit: 100,
        perUserLimit: 1,
        isActive: true,
        expiryDate: new Date().toISOString().split('T')[0]
    });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isUsageModalOpen, setIsUsageModalOpen] = useState(false);
    const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
    const [selectedCouponCode, setSelectedCouponCode] = useState('');
    const [loadingUsage, setLoadingUsage] = useState(false);

    const fetchUsageLogs = async (coupon: Coupon) => {
        setLoadingUsage(true);
        setSelectedCouponCode(coupon.code);
        setIsUsageModalOpen(true);
        try {
            const q = query(
                collection(db, 'couponUsage'), 
                where('couponId', '==', coupon.id)
            );
            const querySnapshot = await getDocs(q);
            const logs = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as UsageLog[];

            // Sort client-side to avoid needing a Firestore Index
            logs.sort((a, b) => {
                const timeA = a.timestamp?.seconds || 0;
                const timeB = b.timestamp?.seconds || 0;
                return timeB - timeA;
            });

            setUsageLogs(logs);
        } catch (error) {
            console.error('Error fetching usage logs:', error);
            toast.error('Failed to load usage history');
        } finally {
            setLoadingUsage(false);
        }
    };

    useEffect(() => {
        fetchCoupons();
    }, []);

    const fetchCoupons = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'coupons'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const data: Coupon[] = [];
            querySnapshot.forEach((document) => {
                const d = document.data();
                data.push({
                    id: document.id,
                    ...d,
                    expiryDate: d.expiryDate?.toDate?.()?.toISOString() || d.expiryDate,
                    createdAt: d.createdAt?.toDate?.()?.toISOString() || d.createdAt,
                } as Coupon);
            });
            setCoupons(data);
        } catch (error) {
            console.error('Error fetching coupons:', error);
            toast.error(`Failed to load coupons: ${(error as any).message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const couponData = {
                ...formData,
                code: formData.code?.toUpperCase(),
                discountValue: Number(formData.discountValue),
                minOrderAmount: Number(formData.minOrderAmount),
                maxDiscount: Number(formData.maxDiscount || 0),
                usageLimit: Number(formData.usageLimit),
                perUserLimit: Number(formData.perUserLimit || 1),
                expiryDate: new Date(`${formData.expiryDate}T23:59:59`),
            };

            if (editingId) {
                await updateDoc(doc(db, 'coupons', editingId), couponData);
                toast.success('Coupon updated successfully');
            } else {
                await addDoc(collection(db, 'coupons'), {
                    ...couponData,
                    usedCount: 0,
                    totalDiscountGiven: 0,
                    createdAt: serverTimestamp()
                });
                toast.success('Coupon created successfully');
            }
            setIsFormOpen(false);
            setEditingId(null);
            fetchCoupons();
        } catch (error) {
            console.error('Error saving coupon:', error);
            toast.error('Failed to save coupon');
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this coupon?')) {
            try {
                await deleteDoc(doc(db, 'coupons', id));
                toast.success('Coupon deleted');
                fetchCoupons();
            } catch (error) {
                toast.error('Failed to delete coupon');
            }
        }
    };

    const toggleStatus = async (coupon: Coupon) => {
        try {
            await updateDoc(doc(db, 'coupons', coupon.id), {
                isActive: !coupon.isActive
            });
            toast.success(`Coupon ${coupon.isActive ? 'disabled' : 'enabled'}`);
            fetchCoupons();
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 text-slate-800">
            <div className="bg-indigo-600 text-white p-4 flex items-center justify-between sticky top-0 z-20 shadow-md">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/admin/dashboard')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-xl font-bold">Coupon Management</h1>
                </div>
                <button
                    onClick={() => {
                        setFormData({
                            code: '',
                            discountType: 'flat',
                            discountValue: 0,
                            minOrderAmount: 0,
                            maxDiscount: 0,
                            usageLimit: 100,
                            perUserLimit: 1,
                            isActive: true,
                            expiryDate: new Date().toISOString().split('T')[0]
                        });
                        setEditingId(null);
                        setIsFormOpen(true);
                    }}
                    className="flex items-center gap-2 bg-white text-indigo-600 px-4 py-2 rounded-lg font-medium hover:bg-indigo-50 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    <span>Create Coupon</span>
                </button>
            </div>

            <div className="max-w-7xl mx-auto p-6">
                {loading ? (
                    <div className="flex justify-center p-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100">
                                        <th className="p-4 font-semibold text-gray-600">Code</th>
                                        <th className="p-4 font-semibold text-gray-600">Type</th>
                                        <th className="p-4 font-semibold text-gray-600">Value</th>
                                        <th className="p-4 font-semibold text-gray-600">Min Order</th>
                                        <th className="p-4 font-semibold text-gray-600">Usage</th>
                                        <th className="p-4 font-semibold text-gray-600">Expiry</th>
                                        <th className="p-4 font-semibold text-gray-600">Status</th>
                                        <th className="p-4 font-semibold text-gray-600 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {coupons.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="p-8 text-center text-gray-500">
                                                No coupons found. Create one to get started.
                                            </td>
                                        </tr>
                                    ) : (
                                        coupons.map((coupon) => (
                                            <tr key={coupon.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                                <td className="p-4 font-mono font-medium text-indigo-600">
                                                    {coupon.code}
                                                </td>
                                                <td className="p-4">
                                                    <span className="flex items-center gap-1 text-sm text-gray-600">
                                                        {coupon.discountType === 'percentage' ? <Percent className="w-3 h-3" /> : <Tag className="w-3 h-3" />}
                                                        {coupon.discountType}
                                                    </span>
                                                </td>
                                                <td className="p-4 font-medium text-gray-800">
                                                    {coupon.discountType === 'flat' ? '₹' : ''}{coupon.discountValue}{coupon.discountType === 'percentage' ? '%' : ''}
                                                </td>
                                                <td className="p-4 text-gray-600">₹{coupon.minOrderAmount}</td>
                                                <td className="p-4">
                                                    <div className="text-sm">
                                                        <span className="font-medium text-gray-800">{coupon.usedCount}</span>
                                                        <span className="text-gray-400 mx-1">/</span>
                                                        <span className="text-gray-600">{coupon.usageLimit}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-sm text-gray-600">
                                                    {new Date(coupon.expiryDate).toLocaleDateString()}
                                                </td>
                                                <td className="p-4">
                                                    <button
                                                        onClick={() => toggleStatus(coupon)}
                                                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                                            coupon.isActive 
                                                                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                        }`}
                                                    >
                                                        {coupon.isActive ? 'Active' : 'Inactive'}
                                                    </button>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => fetchUsageLogs(coupon)}
                                                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                            title="View Usage History"
                                                        >
                                                            <History className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setFormData({
                                                                    ...coupon,
                                                                    expiryDate: new Date(coupon.expiryDate).toISOString().split('T')[0]
                                                                });
                                                                setEditingId(coupon.id);
                                                                setIsFormOpen(true);
                                                            }}
                                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(coupon.id)}
                                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Form */}
            {isFormOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-800">
                                {editingId ? 'Edit Coupon' : 'Create Coupon'}
                            </h2>
                            <button 
                                onClick={() => setIsFormOpen(false)}
                                className="p-2 hover:bg-gray-100 rounded-full text-gray-500"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto">
                            <form id="coupon-form" onSubmit={handleSave} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Coupon Code</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.code}
                                        onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono uppercase"
                                        placeholder="e.g. SUMMER50"
                                    />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                                        <select
                                            value={formData.discountType}
                                            onChange={(e) => setFormData({...formData, discountType: e.target.value as 'flat' | 'percentage'})}
                                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="flat">Flat Amount (₹)</option>
                                            <option value="percentage">Percentage (%)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                                        <input
                                            type="number"
                                            required
                                            min="1"
                                            value={formData.discountValue}
                                            onChange={(e) => setFormData({...formData, discountValue: Number(e.target.value)})}
                                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Min Order Amount (₹)</label>
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            value={formData.minOrderAmount}
                                            onChange={(e) => setFormData({...formData, minOrderAmount: Number(e.target.value)})}
                                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Max Discount (₹) <span className="text-gray-400 font-normal">(Optional)</span></label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={formData.maxDiscount || ''}
                                            onChange={(e) => setFormData({...formData, maxDiscount: Number(e.target.value)})}
                                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                            disabled={formData.discountType === 'flat'}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Usage Limit</label>
                                        <input
                                            type="number"
                                            required
                                            min="1"
                                            value={formData.usageLimit}
                                            onChange={(e) => setFormData({...formData, usageLimit: Number(e.target.value)})}
                                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Per User Limit</label>
                                        <input
                                            type="number"
                                            required
                                            min="1"
                                            value={formData.perUserLimit}
                                            onChange={(e) => setFormData({...formData, perUserLimit: Number(e.target.value)})}
                                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.expiryDate as string}
                                        onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>

                                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                                    <input
                                        type="checkbox"
                                        id="isActive"
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                                        className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                    />
                                    <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                                        Coupon is active and available for use
                                    </label>
                                </div>
                            </form>
                        </div>
                        
                        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-xl">
                            <button
                                type="button"
                                onClick={() => setIsFormOpen(false)}
                                className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="coupon-form"
                                className="px-6 py-2 bg-indigo-600 text-white font-medium hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
                            >
                                {editingId ? 'Update Coupon' : 'Create Coupon'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Usage History Modal */}
            {isUsageModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">Usage History</h2>
                                <p className="text-sm text-gray-500 font-mono">Coupon: {selectedCouponCode}</p>
                            </div>
                            <button onClick={() => setIsUsageModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <Plus className="w-6 h-6 rotate-45" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            {loadingUsage ? (
                                <div className="py-12 text-center text-gray-500">Loading usage data...</div>
                            ) : usageLogs.length === 0 ? (
                                <div className="py-12 text-center text-gray-500">No usage recorded for this coupon yet.</div>
                            ) : (
                                <div className="space-y-4">
                                    {usageLogs.map((log) => (
                                        <div key={log.id} className="bg-gray-50 rounded-lg p-4 border border-gray-100 flex items-center justify-between">
                                            <div className="flex gap-4 items-center">
                                                <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-indigo-600">
                                                    <User className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-800 flex items-center gap-1">
                                                        User: <span className="text-gray-600 font-mono text-xs">{log.userId}</span>
                                                    </p>
                                                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                                        <Clock className="w-3 h-3" />
                                                        {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-green-600">-₹{log.discountAmount}</p>
                                                <p className="text-[10px] text-gray-400 font-mono mt-1 flex items-center justify-end gap-1">
                                                    <Receipt className="w-3 h-3" /> {log.orderId}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="p-6 border-t border-gray-100 flex justify-end bg-gray-50 rounded-b-xl">
                            <button
                                onClick={() => setIsUsageModalOpen(false)}
                                className="px-6 py-2 bg-gray-200 text-gray-700 font-medium hover:bg-gray-300 rounded-lg transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminCoupons;
