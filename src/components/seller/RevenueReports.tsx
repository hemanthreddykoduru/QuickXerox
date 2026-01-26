import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar, TrendingUp, IndianRupee } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../firebase';

interface RevenueData {
  date: string;
  revenue: number;
  orders: number;
}

interface Order {
  id: string;
  total: number;
  timestamp: string;
  status: string;
  shopId: string;
}

const RevenueReports: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('weekly');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch orders from Firestore
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const ordersQuery = query(
      collection(db, 'orders'),
      where('shopId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const fetchedOrders: Order[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        fetchedOrders.push({
          id: doc.id,
          total: Number(data.total) || 0,
          timestamp: data.timestamp,
          status: data.status || 'pending',
          shopId: data.shopId || ''
        });
      });
      console.log('Revenue Reports - Fetched orders:', fetchedOrders.length);
      console.log('Revenue Reports - Completed orders:', fetchedOrders.filter(o => o.status === 'completed').length);
      setOrders(fetchedOrders);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching orders:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Aggregate data by day of week for daily view
  const getDailyData = (): RevenueData[] => {
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    const last7Days = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);

    const dayMap: { [key: string]: { revenue: number; orders: number } } = {};
    daysOfWeek.forEach(day => {
      dayMap[day] = { revenue: 0, orders: 0 };
    });

    orders.forEach(order => {
      // Only count completed orders
      if (order.status !== 'completed') return;

      const orderDate = new Date(order.timestamp);
      if (orderDate >= last7Days && orderDate <= now) {
        const dayName = daysOfWeek[orderDate.getDay()];
        dayMap[dayName].revenue += order.total;
        dayMap[dayName].orders += 1;
      }
    });

    return daysOfWeek.map(day => ({
      date: day,
      revenue: Math.round(dayMap[day].revenue),
      orders: dayMap[day].orders
    }));
  };

  // Aggregate data by week for weekly view - FIXED VERSION
  const getWeeklyData = (): RevenueData[] => {
    const now = new Date();
    const weeks: RevenueData[] = [];

    // For each of the last 4 weeks
    for (let weekIndex = 0; weekIndex < 4; weekIndex++) {
      // Week 1 = 3 weeks ago, Week 2 = 2 weeks ago, Week 3 = 1 week ago, Week 4 = this week
      const weeksAgo = 3 - weekIndex;

      // Calculate start of this week (7 days ago from the end)
      const weekEnd = new Date(now.getTime() - (weeksAgo * 7 * 24 * 60 * 60 * 1000));
      const weekStart = new Date(weekEnd.getTime() - (7 * 24 * 60 * 60 * 1000));

      console.log(`Week ${weekIndex + 1}: ${weekStart.toISOString().slice(0, 10)} to ${weekEnd.toISOString().slice(0, 10)}`);

      let revenue = 0;
      let orderCount = 0;

      orders.forEach(order => {
        // Only count completed orders
        if (order.status !== 'completed') return;

        const orderDate = new Date(order.timestamp);
        const matches = orderDate >= weekStart && orderDate < weekEnd;

        if (matches) {
          console.log(`  ✓ Order ${order.id.slice(-6)}: ${orderDate.toISOString().slice(0, 10)}, ₹${order.total}`);
          revenue += order.total;
          orderCount += 1;
        }
      });

      weeks.push({
        date: `Week ${weekIndex + 1}`,
        revenue: Math.round(revenue),
        orders: orderCount
      });

      console.log(`Week ${weekIndex + 1} TOTAL: ₹${revenue}, ${orderCount} orders\n`);
    }

    return weeks;
  };

  // Aggregate data by month for monthly view
  const getMonthlyData = (): RevenueData[] => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const months: RevenueData[] = [];

    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = monthNames[monthDate.getMonth()];

      let revenue = 0;
      let orderCount = 0;

      orders.forEach(order => {
        // Only count completed orders
        if (order.status !== 'completed') return;

        const orderDate = new Date(order.timestamp);
        if (orderDate.getMonth() === monthDate.getMonth() &&
          orderDate.getFullYear() === monthDate.getFullYear()) {
          revenue += order.total;
          orderCount += 1;
        }
      });

      months.push({
        date: monthName,
        revenue: Math.round(revenue),
        orders: orderCount
      });
    }

    return months;
  };

  // Generate custom date range data
  const getCustomData = (): RevenueData[] => {
    if (!startDate || !endDate) return getDailyData();

    const start = new Date(startDate);
    const end = new Date(endDate);
    const data: RevenueData[] = [];

    let currentDate = new Date(start);
    while (currentDate <= end) {
      let revenue = 0;
      let orderCount = 0;

      orders.forEach(order => {
        // Only count completed orders
        if (order.status !== 'completed') return;

        const orderDate = new Date(order.timestamp);
        if (orderDate.toDateString() === currentDate.toDateString()) {
          revenue += order.total;
          orderCount += 1;
        }
      });

      data.push({
        date: currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: Math.round(revenue),
        orders: orderCount
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return data;
  };

  const getData = (): RevenueData[] => {
    switch (timeRange) {
      case 'daily':
        return getDailyData();
      case 'weekly':
        return getWeeklyData();
      case 'monthly':
        return getMonthlyData();
      case 'custom':
        return getCustomData();
      default:
        return getDailyData();
    }
  };

  const getTotalRevenue = () => {
    return getData().reduce((sum, item) => sum + item.revenue, 0);
  };

  const getTotalOrders = () => {
    return getData().reduce((sum, item) => sum + item.orders, 0);
  };

  const handleCustomRangeSelect = () => {
    setTimeRange('custom');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Loading revenue data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Revenue Reports</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setTimeRange('daily')}
            className={`px-4 py-2 rounded-md ${timeRange === 'daily'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            Daily
          </button>
          <button
            onClick={() => setTimeRange('weekly')}
            className={`px-4 py-2 rounded-md ${timeRange === 'weekly'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setTimeRange('monthly')}
            className={`px-4 py-2 rounded-md ${timeRange === 'monthly'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            Monthly
          </button>
          <button
            onClick={handleCustomRangeSelect}
            className={`px-4 py-2 rounded-md ${timeRange === 'custom'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            Custom Range
          </button>
        </div>
      </div>

      {timeRange === 'custom' && (
        <div className="flex space-x-4 mb-6">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Revenue</p>
              <p className="text-2xl font-bold text-blue-900">₹{getTotalRevenue()}</p>
            </div>
            <IndianRupee className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Total Orders</p>
              <p className="text-2xl font-bold text-green-900">{getTotalOrders()}</p>
            </div>
            <Calendar className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Average Order Value</p>
              <p className="text-2xl font-bold text-purple-900">
                ₹{getTotalOrders() > 0 ? (getTotalRevenue() / getTotalOrders()).toFixed(2) : '0.00'}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={getData()}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" />
            <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="revenue" fill="#3b82f6" name="Revenue (₹)" />
            <Bar yAxisId="right" dataKey="orders" fill="#10b981" name="Orders" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RevenueReports;