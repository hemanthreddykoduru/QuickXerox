import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Download, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface OfflineSupportProps {
  children: React.ReactNode;
}

const OfflineSupport: React.FC<OfflineSupportProps> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineData, setOfflineData] = useState<any[]>([]);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Connection restored!');
      syncOfflineData();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error('You are now offline. Some features may be limited.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // Load offline data from localStorage
    const savedData = localStorage.getItem('quickxerox_offline_data');
    if (savedData) {
      setOfflineData(JSON.parse(savedData));
    }
  }, []);

  const syncOfflineData = async () => {
    if (offlineData.length === 0) return;

    setSyncStatus('syncing');
    try {
      // Simulate API sync
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Clear offline data after successful sync
      localStorage.removeItem('quickxerox_offline_data');
      setOfflineData([]);
      setSyncStatus('success');
      toast.success('Offline data synced successfully!');
    } catch (error) {
      setSyncStatus('error');
      toast.error('Failed to sync offline data');
    }
  };

  const saveOfflineData = (data: any) => {
    const newOfflineData = [...offlineData, { ...data, timestamp: new Date().toISOString() }];
    setOfflineData(newOfflineData);
    localStorage.setItem('quickxerox_offline_data', JSON.stringify(newOfflineData));
    toast.success('Data saved for offline sync');
  };

  return (
    <div className="relative">
      {/* Connection Status Indicator */}
      <div className={`fixed top-4 right-4 z-50 flex items-center space-x-2 px-3 py-2 rounded-lg shadow-lg transition-all duration-300 ${
        isOnline 
          ? 'bg-green-100 text-green-800 border border-green-200' 
          : 'bg-red-100 text-red-800 border border-red-200'
      }`}>
        {isOnline ? (
          <Wifi className="h-4 w-4" />
        ) : (
          <WifiOff className="h-4 w-4" />
        )}
        <span className="text-sm font-medium">
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Sync Status */}
      {!isOnline && offlineData.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              {syncStatus === 'syncing' && (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              )}
              {syncStatus === 'success' && (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              {syncStatus === 'error' && (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              {syncStatus === 'idle' && (
                <Download className="h-5 w-5 text-blue-500" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                {offlineData.length} items pending sync
              </p>
              <p className="text-xs text-gray-500">
                Will sync when connection is restored
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={!isOnline ? 'opacity-75' : ''}>
        {children}
      </div>

      {/* Offline Notice */}
      {!isOnline && (
        <div className="fixed bottom-0 left-0 right-0 bg-yellow-100 border-t border-yellow-200 p-3 z-40">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <WifiOff className="h-5 w-5 text-yellow-600" />
              <span className="text-sm text-yellow-800">
                You're offline. Some features may be limited.
              </span>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="text-sm text-yellow-800 hover:text-yellow-900 font-medium"
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfflineSupport;
