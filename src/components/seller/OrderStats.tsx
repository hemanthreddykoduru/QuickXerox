import React from 'react';
import { DollarSign, Clock, CheckCircle, IndianRupee } from 'lucide-react';
import { Order } from '../../types';

interface OrderStatsProps {
  orders: Order[];
}

const OrderStats: React.FC<OrderStatsProps> = ({ orders }) => {
  // Calculate statistics
  const stats = {
    pending: orders.filter((order) => order.status === 'pending').length,
    processing: orders.filter((order) => order.status === 'processing').length,
    completed: orders.filter((order) => order.status === 'completed').length,
    totalRevenue: orders
      .filter((order) => order.status === 'completed')
      .reduce((sum, order) => sum + order.total, 0),
  };

  // Statistic items
  const statItems = [
    {
      title: 'Pending Orders',
      value: stats.pending,
      icon: <Clock className="h-6 w-6 text-yellow-400" />,
      bgColor: 'bg-yellow-100',
    },
    {
      title: 'Processing Orders',
      value: stats.processing,
      icon: <Clock className="h-6 w-6 text-blue-400" />,
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Completed Orders',
      value: stats.completed,
      icon: <CheckCircle className="h-6 w-6 text-green-400" />,
      bgColor: 'bg-green-100',
    },
    {
      title: "Today's Revenue",
      value: `₹${stats.totalRevenue.toFixed(2)}`,
      icon: <IndianRupee className="h-6 w-6 text-green-400" />,
      bgColor: 'bg-green-100',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {statItems.map((item, index) => (
        <div
          key={index}
          className="bg-white overflow-hidden shadow-sm rounded-lg"
        >
          <div className="p-5">
            <div className="flex items-center">
              <div
                className={`flex-shrink-0 p-2 rounded-full ${item.bgColor}`}
              >
                {item.icon}
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {item.title}
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {item.value}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default OrderStats;
