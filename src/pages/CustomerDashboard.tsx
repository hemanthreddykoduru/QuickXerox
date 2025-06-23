import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Printer, MapPin, Clock, CreditCard, CheckCircle, LogOut, User } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import PrintShopCard from '../components/PrintShopCard';
import FileUpload from '../components/FileUpload';
import PrintJobList from '../components/PrintJobList';
import Cart from '../components/Cart';
import CartButton from '../components/CartButton';
import FloatingCartButton from '../components/FloatingCartButton';
import { PrintJob, PrintShop } from '../types';
import { db } from '../firebase'; // Import db
import { collection, getDocs, onSnapshot, query, where } from 'firebase/firestore'; // Import Firestore functions
import { toast } from 'react-hot-toast';

function CustomerDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [printJobs, setPrintJobs] = useState<PrintJob[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedShop, setSelectedShop] = useState<PrintShop | null>(null);
  const [showFloatingCart, setShowFloatingCart] = useState(false);
  const [printShops, setPrintShops] = useState<PrintShop[]>([]); // New state for dynamic shops

  useEffect(() => {
    // Check if the user is authenticated
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }

    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const headerHeight = 80;
      setShowFloatingCart(scrollPosition > headerHeight);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [navigate]);

  // Fetch print shops from Firebase in real-time
  useEffect(() => {
    const shopsRef = collection(db, 'shopOwners');
    const unsubscribe = onSnapshot(shopsRef, (querySnapshot) => {
      const fetchedShops: PrintShop[] = [];
      querySnapshot.forEach(doc => {
        const data = doc.data();
        if (data.settings?.shop?.name) { 
          fetchedShops.push({
            id: doc.id, 
            name: data.settings?.shop?.name || 'N/A',
            rating: data.rating || 4.5, 
            distance: data.distance || 'N/A', 
            price: data.settings?.preferences?.perPageCostAdjustment ?? 2.50, 
            eta: data.eta || '20-30', 
            image: data.image || 'https://lh3.googleusercontent.com/gps-cs-s/AC9h4noan8Hek57X2BZ6IMo3jnJ-PXolN7bl_rS8ddcpJvRbQbRMHj-5vw1gjJ9fVXXqS8_6NtLH_im9FvLhzehe5jmmpiCRraA_pZqxg_a62-7hir81dcPYwUAFN3n6HGMtqWkBNpqYVQ=s1360-w1360-h1020-rw', 
            isShopOpen: data.settings?.businessHours?.isShopOpen ?? true, 
            perPageCostAdjustment: data.settings?.preferences?.perPageCostAdjustment ?? 0.00,
          });
        }
      });
      console.log('Fetched shops (real-time):', fetchedShops.map(shop => ({ id: shop.id, name: shop.name, price: shop.price, perPageCostAdjustmentFetched: shop.perPageCostAdjustment, image: shop.image, isShopOpen: shop.isShopOpen })));
      setPrintShops(fetchedShops);
    }, (error) => {
      console.error('Error fetching print shops in real-time:', error);
      toast.error('Failed to load print shops in real-time.');
    });

    return () => unsubscribe();
  }, []);

  // Handle navigation attempts
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (localStorage.getItem('isAuthenticated')) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const handleLogout = () => {
    // Clear all authentication data
    localStorage.clear();
    // Force navigation to login page
    navigate('/login', { replace: true });
  };

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

  const handleShopSelect = (shopId: string) => { // Change shopId type to string
    const shop = printShops.find(s => s.id === shopId); // Use printShops
    setSelectedShop(shop || null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <Printer className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900">QuickXerox</h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="hidden sm:flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-gray-500" />
                <span className="text-gray-600 text-sm">Gitam, Bengaluru</span>
              </div>
              <CartButton
                itemCount={printJobs.length}
                onClick={() => setIsCartOpen(true)}
              />
              <button
                onClick={() => navigate('/account')}
                className="p-1 sm:p-2 text-gray-600 hover:text-blue-600 transition-colors"
                title="View Account"
                aria-label="View Account"
              >
                <User className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 text-gray-600 hover:text-blue-600 transition-colors"
                title="Logout"
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline text-sm">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Hero Section */}
        <div className="text-center mb-6 sm:mb-12">
          <h2 className="text-xl sm:text-4xl font-bold text-gray-900 mb-1 sm:mb-4">
            Print Documents at Nearby Shops
          </h2>
          <p className="text-sm sm:text-xl text-gray-600">
            Upload your files and get them printed at trusted local print shops
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-xl shadow-md p-3 sm:p-6 mb-6 sm:mb-8">
          <div className="space-y-6 sm:space-y-8">
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
          <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-3 sm:mb-6">Nearby Print Shops</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {printShops.map((shop) => ( // Use printShops here
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
        <div className="mt-8 sm:mt-16 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-8">
          <div className="flex flex-col items-center text-center p-3">
            <Clock className="h-8 w-8 sm:h-12 sm:w-12 text-blue-600 mb-1 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-semibold mb-1 sm:mb-2">Quick Turnaround</h3>
            <p className="text-sm sm:text-base text-gray-600">Get your prints in as little as 15 minutes</p>
          </div>
          <div className="flex flex-col items-center text-center p-3">
            <CreditCard className="h-8 w-8 sm:h-12 sm:w-12 text-blue-600 mb-1 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-semibold mb-1 sm:mb-2">Secure Payment</h3>
            <p className="text-sm sm:text-base text-gray-600">Pay securely online or at the shop</p>
          </div>
          <div className="flex flex-col items-center text-center p-3">
            <CheckCircle className="h-8 w-8 sm:h-12 sm:w-12 text-blue-600 mb-1 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-semibold mb-1 sm:mb-2">Quality Guaranteed</h3>
            <p className="text-sm sm:text-base text-gray-600">100% satisfaction guaranteed</p>
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
        shops={printShops}
      />
    </div>
  );
}

export default CustomerDashboard;
