import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer, MapPin, Clock, CreditCard, CheckCircle, LogOut, User } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import PrintShopCard from '../components/PrintShopCard';
import FileUpload from '../components/FileUpload';
import PrintJobList from '../components/PrintJobList';
import Cart from '../components/Cart';
import CartButton from '../components/CartButton';
import FloatingCartButton from '../components/FloatingCartButton';
import { PrintJob, PrintShop } from '../types';

function CustomerDashboard() {
  const navigate = useNavigate();
  const [printJobs, setPrintJobs] = useState<PrintJob[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedShop, setSelectedShop] = useState<PrintShop | null>(null);
  const [showFloatingCart, setShowFloatingCart] = useState(false);

  useEffect(() => {
    // Check if the user is authenticated
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    if (!isAuthenticated) {
      // Redirect to login page if not authenticated
      navigate('/login');
    }

    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const headerHeight = 80; // Approximate header height
      setShowFloatingCart(scrollPosition > headerHeight);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [navigate]);

  const handleLogout = () => {
    // Remove the authentication flag from localStorage
    localStorage.setItem('isAuthenticated', 'true');
    // Redirect to the login page after logout
    navigate('/login');
  };

  const nearbyShops: PrintShop[] = [
    {
      id: 1,
      name: "Shop 1",
      rating: 4.8,
      distance: "0.3",
      price: 2.50,
      eta: "15-20",
      image: "https://images.unsplash.com/photo-1562564055-71e051d33c19?auto=format&fit=crop&q=80&w=2940"
    },
    {
      id: 2,
      name: "Shop 2",
      rating: 4.6,
      distance: "0.7",
      price: 2.00,
      eta: "25-30",
      image: "https://images.unsplash.com/photo-1504805572947-34fad45aed93?auto=format&fit=crop&q=80&w=2940"
    },
    {
      id: 3,
      name: "Shop 3",
      rating: 4.9,
      distance: "1.2",
      price: 3.00,
      eta: "10-15",
      image: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=2940"
    }
  ];

  const handleFileSelect = (files: FileList) => {
    const newJobs = Array.from(files).map(file => ({
      id: uuidv4(),
      file,
      copies: 1,
      isColor: false
    }));
    setPrintJobs([...printJobs, ...newJobs]);
  };

  const handleUpdateJob = (updatedJob: PrintJob) => {
    setPrintJobs(printJobs.map(job => 
      job.id === updatedJob.id ? updatedJob : job
    ));
  };

  const handleRemoveJob = (id: string) => {
    setPrintJobs(printJobs.filter(job => job.id !== id));
  };

  const handleShopSelect = (shopId: number) => {
    const shop = nearbyShops.find(s => s.id === shopId);
    setSelectedShop(shop || null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Printer className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">QuickXerox</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-gray-500" />
                <span className="text-gray-600">Gitam, Bengaluru</span>
              </div>
              <CartButton
                itemCount={printJobs.length}
                onClick={() => setIsCartOpen(true)}
              />
              <button
                onClick={() => navigate('/account')}
                className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
              >
                <User className="h-6 w-6" />
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 text-gray-600 hover:text-blue-600 transition-colors"
              >
                <LogOut className="h-5 w-5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Print Documents at Nearby Shops
          </h2>
          <p className="text-lg sm:text-xl text-gray-600">
            Upload your files and get them printed at trusted local print shops
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-8">
          <div className="space-y-8">
            <FileUpload onFileSelect={handleFileSelect} />
            
            {printJobs.length > 0 && (
              <PrintJobList
                jobs={printJobs}
                onUpdateJob={handleUpdateJob}
                onRemoveJob={handleRemoveJob}
              />
            )}
          </div>
        </div>

        {/* Print Shops Section */}
        <div>
          <h3 className="text-2xl font-semibold text-gray-900 mb-6">Nearby Print Shops</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {nearbyShops.map((shop) => (
              <PrintShopCard 
                key={shop.id} 
                shop={shop}
                isSelected={selectedShop?.id === shop.id}
                onSelect={() => {
                  handleShopSelect(shop.id);
                  if (printJobs.length > 0) {
                    setIsCartOpen(true);
                  }
                }}
              />
            ))}
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col items-center text-center">
            <Clock className="h-12 w-12 text-blue-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Quick Turnaround</h3>
            <p className="text-gray-600">Get your prints in as little as 15 minutes</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <CreditCard className="h-12 w-12 text-blue-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Secure Payment</h3>
            <p className="text-gray-600">Pay securely online or at the shop</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <CheckCircle className="h-12 w-12 text-blue-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Quality Guaranteed</h3>
            <p className="text-gray-600">100% satisfaction guaranteed</p>
          </div>
        </div>
      </main>

      {/* Floating Cart Button */}
      <FloatingCartButton
        itemCount={printJobs.length}
        onClick={() => setIsCartOpen(true)}
        isVisible={showFloatingCart && printJobs.length > 0}
      />

      {/* Cart */}
      <Cart
        items={printJobs}
        onRemove={handleRemoveJob}
        basePrice={selectedShop?.price || 2.50}
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        selectedShop={selectedShop}
        onShopSelect={handleShopSelect}
        shops={nearbyShops}
      />
    </div>
  );
}

export default CustomerDashboard;
