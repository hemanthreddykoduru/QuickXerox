import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar, TrendingUp, IndianRupee } from 'lucide-react';

interface RevenueData {
  date: string;
  revenue: number;
  orders: number;
}

const RevenueReports: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Sample data - In a real app, this would come from your backend
  const dailyData: RevenueData[] = [
    { date: 'Mon', revenue: 1200, orders: 15 },
    { date: 'Tue', revenue: 1500, orders: 18 },
    { date: 'Wed', revenue: 1800, orders: 22 },
    { date: 'Thu', revenue: 1400, orders: 17 },
    { date: 'Fri', revenue: 2000, orders: 25 },
    { date: 'Sat', revenue: 2200, orders: 28 },
    { date: 'Sun', revenue: 1600, orders: 20 },
  ];

  const weeklyData: RevenueData[] = [
    { date: 'Week 1', revenue: 8500, orders: 105 },
    { date: 'Week 2', revenue: 9200, orders: 115 },
    { date: 'Week 3', revenue: 8800, orders: 110 },
    { date: 'Week 4', revenue: 9500, orders: 120 },
  ];

  const monthlyData: RevenueData[] = [
    { date: 'Jan', revenue: 32000, orders: 400 },
    { date: 'Feb', revenue: 35000, orders: 440 },
    { date: 'Mar', revenue: 38000, orders: 480 },
    { date: 'Apr', revenue: 36000, orders: 450 },
    { date: 'May', revenue: 39000, orders: 490 },
    { date: 'Jun', revenue: 42000, orders: 520 },
  ];

  // Generate custom date range data
  const generateCustomData = (start: string, end: string): RevenueData[] => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const data: RevenueData[] = [];
    
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      // Generate random revenue between 1000 and 3000
      const revenue = Math.floor(Math.random() * 2000) + 1000;
      // Generate random orders between 10 and 30
      const orders = Math.floor(Math.random() * 20) + 10;
      
      data.push({
        date: currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue,
        orders,
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return data;
  };

  const getData = () => {
    switch (timeRange) {
      case 'daily':
        return dailyData;
      case 'weekly':
        return weeklyData;
      case 'monthly':
        return monthlyData;
      case 'custom':
        if (startDate && endDate) {
          return generateCustomData(startDate, endDate);
        }
        return dailyData;
      default:
        return dailyData;
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

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Revenue Reports</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setTimeRange('daily')}
            className={`px-4 py-2 rounded-md ${
              timeRange === 'daily'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setTimeRange('weekly')}
            className={`px-4 py-2 rounded-md ${
              timeRange === 'weekly'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setTimeRange('monthly')}
            className={`px-4 py-2 rounded-md ${
              timeRange === 'monthly'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={handleCustomRangeSelect}
            className={`px-4 py-2 rounded-md ${
              timeRange === 'custom'
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
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2">
            <IndianRupee className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Total Revenue</h3>
          </div>
          <p className="text-2xl font-bold text-blue-600 mt-2">
            ₹{getTotalRevenue().toLocaleString()}
          </p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Total Orders</h3>
          </div>
          <p className="text-2xl font-bold text-green-600 mt-2">
            {getTotalOrders().toLocaleString()}
          </p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">Average Order Value</h3>
          </div>
          <p className="text-2xl font-bold text-purple-600 mt-2">
            ₹{(getTotalRevenue() / getTotalOrders()).toFixed(2)}
          </p>
        </div>
      </div>

      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={getData()}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis yAxisId="left" orientation="left" stroke="#3B82F6" />
            <YAxis yAxisId="right" orientation="right" stroke="#10B981" />
            <Tooltip />
            <Legend />
            <Bar
              yAxisId="left"
              dataKey="revenue"
              name="Revenue (₹)"
              fill="#3B82F6"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              yAxisId="right"
              dataKey="orders"
              name="Orders"
              fill="#10B981"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RevenueReports; 