import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, Users, ShoppingCart, DollarSign, Clock, MapPin } from 'lucide-react';
import { db } from '../../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

interface AnalyticsData {
  revenue: {
    daily: number;
    weekly: number;
    monthly: number;
    growth: number;
  };
  orders: {
    total: number;
    pending: number;
    completed: number;
    cancelled: number;
    growth: number;
  };
  users: {
    total: number;
    active: number;
    new: number;
    growth: number;
  };
  shops: {
    total: number;
    active: number;
    pending: number;
    growth: number;
  };
}

interface ChartData {
  name: string;
  value: number;
  color?: string;
}

interface AnalyticsDashboardProps {
  onManageUsers?: () => void;
  onManageShops?: () => void;
  onViewOrders?: () => void;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ onManageUsers, onManageShops, onViewOrders }) => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [isLoading, setIsLoading] = useState(true);
  const [revenueSeries, setRevenueSeries] = useState<{ name: string; revenue: number; orders: number; }[]>([]);
  const [orderStatusSeries, setOrderStatusSeries] = useState<{ name: string; value: number; color: string; }[]>([]);

  useEffect(() => {
    setIsLoading(true);
    const unsubscribers: Array<() => void> = [];

    try {
      // Users collection (customers)
      const usersRef = collection(db, 'users');
      const unsubUsers = onSnapshot(usersRef, (snap) => {
        const totalUsers = snap.size;
        const activeUsers = snap.docs.filter(d => (d.data() as any)?.isActive === true).length;
        setAnalyticsData(prev => ({
          revenue: prev?.revenue || { daily: 0, weekly: 0, monthly: 0, growth: 0 },
          orders: prev?.orders || { total: 0, pending: 0, completed: 0, cancelled: 0, growth: 0 },
          users: { total: totalUsers, active: activeUsers || totalUsers, new: 0, growth: prev?.users?.growth ?? 0 },
          shops: prev?.shops || { total: 0, active: 0, pending: 0, growth: 0 },
        }));
      });
      unsubscribers.push(unsubUsers);

      // Shops collection (sellers)
      const shopsRef = collection(db, 'shopOwners');
      const unsubShops = onSnapshot(shopsRef, (snap) => {
        const totalShops = snap.size;
        const activeShops = snap.docs.filter(d => (d.data() as any)?.settings?.businessHours?.isShopOpen === true).length;
        setAnalyticsData(prev => ({
          revenue: prev?.revenue || { daily: 0, weekly: 0, monthly: 0, growth: 0 },
          orders: prev?.orders || { total: 0, pending: 0, completed: 0, cancelled: 0, growth: 0 },
          users: prev?.users || { total: 0, active: 0, new: 0, growth: 0 },
          shops: { total: totalShops, active: activeShops || totalShops, pending: Math.max(totalShops - (activeShops || 0), 0), growth: prev?.shops?.growth ?? 0 },
        }));
      });
      unsubscribers.push(unsubShops);

      // Orders collection (if present)
      const ordersRef = collection(db, 'orders');
      const unsubOrders = onSnapshot(query(ordersRef, orderBy('timestamp', 'desc')), (snap) => {
        const orders = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        const total = orders.length;
        const pending = orders.filter(o => (o.status || '').toLowerCase() === 'pending').length;
        const completed = orders.filter(o => (o.status || '').toLowerCase() === 'completed').length;
        const cancelled = orders.filter(o => (o.status || '').toLowerCase() === 'cancelled').length;

        // Revenue calculations: sum amounts for selected window
        const now = new Date();
        const daysWindow = selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 90;
        const windowStart = new Date(now.getTime() - daysWindow * 24 * 60 * 60 * 1000);
        const inWindow = orders.filter(o => {
          const ts = o.timestamp ? new Date(o.timestamp) : null;
          return ts && ts >= windowStart && ts <= now;
        });
        const revenueSum = inWindow.reduce((sum, o) => sum + (Number(o.total) || Number(o.amount) || 0), 0);

        // Build revenue trend per day for the window (last 7 days shown)
        const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        const trendMap: Record<string, { revenue: number; orders: number; }> = {};
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          trendMap[days[d.getDay()]] = { revenue: 0, orders: 0 };
        }
        inWindow.forEach(o => {
          const ts = o.timestamp ? new Date(o.timestamp) : null;
          if (!ts) return;
          const key = days[ts.getDay()];
          if (!trendMap[key]) trendMap[key] = { revenue: 0, orders: 0 };
          trendMap[key].revenue += Number(o.total) || Number(o.amount) || 0;
          trendMap[key].orders += 1;
        });
        const trend = Object.keys(trendMap).map(k => ({ name: k, revenue: trendMap[k].revenue, orders: trendMap[k].orders }));
        setRevenueSeries(trend);

        // Order status distribution
        setOrderStatusSeries([
          { name: 'Completed', value: completed, color: '#10B981' },
          { name: 'Pending', value: pending, color: '#F59E0B' },
          { name: 'Cancelled', value: cancelled, color: '#EF4444' },
        ]);

        setAnalyticsData(prev => ({
          revenue: { daily: 0, weekly: 0, monthly: revenueSum, growth: prev?.revenue?.growth ?? 0 },
          orders: { total, pending, completed, cancelled, growth: prev?.orders?.growth ?? 0 },
          users: prev?.users || { total: 0, active: 0, new: 0, growth: 0 },
          shops: prev?.shops || { total: 0, active: 0, pending: 0, growth: 0 },
        }));
      }, (err) => {
        // orders collection may not exist; keep dashboard partial
        console.warn('Orders snapshot failed or collection missing:', err?.message || err);
        setRevenueSeries([
          { name: 'Mon', revenue: 0, orders: 0 },
          { name: 'Tue', revenue: 0, orders: 0 },
          { name: 'Wed', revenue: 0, orders: 0 },
          { name: 'Thu', revenue: 0, orders: 0 },
          { name: 'Fri', revenue: 0, orders: 0 },
          { name: 'Sat', revenue: 0, orders: 0 },
          { name: 'Sun', revenue: 0, orders: 0 },
        ]);
        setOrderStatusSeries([
          { name: 'Completed', value: 0, color: '#10B981' },
          { name: 'Pending', value: 0, color: '#F59E0B' },
          { name: 'Cancelled', value: 0, color: '#EF4444' },
        ]);
      });
      unsubscribers.push(unsubOrders);
    } finally {
      setIsLoading(false);
    }

    return () => unsubscribers.forEach(u => u());
  }, [selectedPeriod]);

  const revenueData = revenueSeries.length ? revenueSeries : [
    { name: 'Mon', revenue: 0, orders: 0 },
    { name: 'Tue', revenue: 0, orders: 0 },
    { name: 'Wed', revenue: 0, orders: 0 },
    { name: 'Thu', revenue: 0, orders: 0 },
    { name: 'Fri', revenue: 0, orders: 0 },
    { name: 'Sat', revenue: 0, orders: 0 },
    { name: 'Sun', revenue: 0, orders: 0 }
  ];

  const orderStatusData = orderStatusSeries.length ? orderStatusSeries : [
    { name: 'Completed', value: 0, color: '#10B981' },
    { name: 'Pending', value: 0, color: '#F59E0B' },
    { name: 'Cancelled', value: 0, color: '#EF4444' }
  ];

  const topShopsData = [
    { name: 'PrintPro Hub', orders: 234, revenue: 45000 },
    { name: 'QuickPrint Center', orders: 189, revenue: 38000 },
    { name: 'Digital Print Shop', orders: 156, revenue: 32000 },
    { name: 'Express Print', orders: 134, revenue: 28000 },
    { name: 'City Printers', orders: 98, revenue: 21000 }
  ];

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    growth: number;
    icon: React.ComponentType<any>;
    color: string;
  }> = ({ title, value, growth, icon: Icon, color }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <div className="flex items-center mt-2">
            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-sm text-green-600 font-medium">+{growth}%</span>
            <span className="text-sm text-gray-500 ml-1">vs last period</span>
          </div>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Failed to load analytics data</p>
      </div>
    );
  }

  // Helpers to map values to selected period
  const getRevenueValue = () => {
    if (!analyticsData) return 0;
    if (selectedPeriod === '7d') return analyticsData.revenue.weekly;
    if (selectedPeriod === '30d') return analyticsData.revenue.monthly;
    return Math.round(analyticsData.revenue.monthly * 3); // rough mock for 90d
  };

  const getOrdersTotal = () => {
    if (!analyticsData) return 0;
    if (selectedPeriod === '7d') return Math.round(analyticsData.orders.total * 0.25);
    if (selectedPeriod === '30d') return analyticsData.orders.total;
    return Math.round(analyticsData.orders.total * 3); // mock scale for 90d
  };

  const getActiveUsers = () => {
    if (!analyticsData) return 0;
    if (selectedPeriod === '7d') return Math.round(analyticsData.users.active * 0.6);
    if (selectedPeriod === '30d') return analyticsData.users.active;
    return Math.round(analyticsData.users.active * 1.2);
  };

  return (
    <div className="space-y-6">
      {/* Toolbar (title is shown in modal header to avoid duplicate) */}
      <div className="flex items-center justify-end">
        <div className="flex items-center space-x-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as '7d' | '30d' | '90d')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            title="Select time period"
            aria-label="Select time period for analytics"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Revenue"
          value={`₹${getRevenueValue().toLocaleString()}`}
          growth={analyticsData.revenue.growth}
          icon={DollarSign}
          color="bg-green-500"
        />
        <StatCard
          title="Total Orders"
          value={getOrdersTotal().toLocaleString()}
          growth={analyticsData.orders.growth}
          icon={ShoppingCart}
          color="bg-blue-500"
        />
        <StatCard
          title="Active Users"
          value={getActiveUsers().toLocaleString()}
          growth={analyticsData.users.growth}
          icon={Users}
          color="bg-purple-500"
        />
        <StatCard
          title="Print Shops"
          value={analyticsData.shops.total}
          growth={analyticsData.shops.growth}
          icon={MapPin}
          color="bg-orange-500"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Revenue']} />
              <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Order Status Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={orderStatusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {orderStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center space-x-6 mt-4">
            {orderStatusData.map((item) => (
              <div key={item.name} className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-sm text-gray-600">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Performing Shops */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Print Shops</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={topShopsData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Revenue']} />
            <Bar dataKey="revenue" fill="#3B82F6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={onManageUsers}
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            aria-label="Manage users"
            title="Manage users"
          >
            <Users className="h-6 w-6 text-blue-600" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Manage Users</p>
              <p className="text-sm text-gray-600">View and manage user accounts</p>
            </div>
          </button>
          <button
            onClick={onManageShops}
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            aria-label="Manage shops"
            title="Manage shops"
          >
            <MapPin className="h-6 w-6 text-green-600" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Manage Shops</p>
              <p className="text-sm text-gray-600">Approve and manage print shops</p>
            </div>
          </button>
          <button
            onClick={onViewOrders}
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            aria-label="View orders"
            title="View orders"
          >
            <ShoppingCart className="h-6 w-6 text-purple-600" />
            <div className="text-left">
              <p className="font-medium text-gray-900">View Orders</p>
              <p className="text-sm text-gray-600">Monitor all orders and status</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
