import React from 'react';
import Skeleton from './Skeleton';

const DashboardSkeleton = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Skeleton */}
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Skeleton variant="circular" width={32} height={32} />
              <Skeleton width={120} height={24} />
            </div>
            <div className="flex items-center space-x-4">
              <Skeleton width={100} height={16} className="hidden sm:block" />
              <div className="flex space-x-2">
                <Skeleton variant="circular" width={36} height={36} />
                <Skeleton variant="circular" width={36} height={36} />
                <Skeleton variant="circular" width={36} height={36} />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Hero Skeleton */}
        <div className="text-center mb-8 sm:mb-12">
          <Skeleton width="60%" height={40} className="mx-auto mb-4" />
          <Skeleton width="40%" height={24} className="mx-auto" />
        </div>

        {/* Upload Section Skeleton */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <Skeleton width="100%" height={200} className="rounded-2xl" />
        </div>

        {/* Print Shops Section Skeleton */}
        <div>
          <Skeleton width={200} height={32} className="mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-2xl shadow-md overflow-hidden">
                <Skeleton width="100%" height={176} />
                <div className="p-4 space-y-4">
                  <Skeleton width="70%" height={20} />
                  <div className="flex gap-2">
                    <Skeleton width={40} height={16} />
                    <Skeleton width={40} height={16} />
                    <Skeleton width={40} height={16} />
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <Skeleton width={80} height={24} />
                    <Skeleton width={80} height={36} className="rounded-xl" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardSkeleton;
