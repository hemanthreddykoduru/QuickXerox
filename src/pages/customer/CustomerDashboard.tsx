import { useState, useEffect, useMemo } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
import { useNavigate } from 'react-router-dom';
import { 
  Printer, MapPin, Clock, CreditCard, CheckCircle, LogOut, 
  User as UserIcon, Bell, X, Search, SlidersHorizontal, 
  ChevronRight, Sparkles, Star, Zap
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'framer-motion';
import PrintShopCard from '../../components/shops/PrintShopCard';
import FileUpload from '../../components/common/FileUpload';
import PrintJobList from '../../components/shops/PrintJobList';
import Cart from '../../components/cart/Cart';
import CartButton from '../../components/cart/CartButton';
import FloatingCartButton from '../../components/cart/FloatingCartButton';
import DocumentAnalyzer from '../../components/ai/DocumentAnalyzer';
import OrderTracking from '../../components/orders/OrderTracking';
import OTPVerification from '../../components/orders/OTPVerification';
import NotificationCenter from '../../components/notifications/NotificationCenter';
import { PrintJob, PrintShop, Order } from '../../types';
import { db } from '../../firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { useProfile } from '../../hooks/useProfile';
import Skeleton from '../../components/common/Skeleton';

type SortOption = 'distance' | 'rating' | 'price';

function CustomerDashboard() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [printJobs, setPrintJobs] = useState<PrintJob[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedShop, setSelectedShop] = useState<PrintShop | null>(null);
  const [showFloatingCart, setShowFloatingCart] = useState(false);
  const [printShops, setPrintShops] = useState<PrintShop[]>([]);
  const [isLoadingShops, setIsLoadingShops] = useState(true);
  const [userLocation, setUserLocation] = useState<string>('Detecting location...');
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [selectedFileForAnalysis, setSelectedFileForAnalysis] = useState<File | null>(null);
  const [showOrderTracking, setShowOrderTracking] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [selectedOrderForOTP, setSelectedOrderForOTP] = useState<Order | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  
  // New UI states
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('distance');
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }

    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsScrolled(scrollY > 10);
      setShowFloatingCart(scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [navigate]);

  // Geolocation & Reverse Geocoding
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude: lat, longitude: lng } = position.coords;
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await response.json();
            const addr = data.address || {};
            setUserLocation(addr.city || addr.town || addr.village || addr.suburb || 'Nearby');
          } catch {
            setUserLocation('Detected Area');
          }
        },
        () => setUserLocation('Location Private'),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, []);

  // Fetch Shops
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'shopOwners'), (snapshot) => {
      const fetched = snapshot.docs.map(doc => {
        const data = doc.data();
        const costAdjustment = data.settings?.preferences?.perPageCostAdjustment ?? 0;
        return {
          id: doc.id,
          name: data.settings?.shop?.name || 'Local Print Shop',
          rating: data.rating || 4.5,
          distance: (Math.random() * 2 + 0.1).toFixed(1), // Mock distance for demo
          price: (costAdjustment + 3.5),
          eta: data.eta || '15-25',
          image: data.settings?.shop?.shopPictureUrl || 'https://images.unsplash.com/photo-1568667256549-094345857637?auto=format&fit=crop&q=80&w=800',
          isShopOpen: data.settings?.businessHours?.isShopOpen ?? true,
          perPageCostAdjustment: costAdjustment,
        };
      }).filter(s => s.name !== 'N/A');
      setPrintShops(fetched);
      setIsLoadingShops(false);
    });
    return () => unsubscribe();
  }, []);

  // Filter and Sort Logic
  const filteredShops = useMemo(() => {
    return printShops
      .filter(shop => shop.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => {
        if (sortBy === 'distance') return parseFloat(a.distance) - parseFloat(b.distance);
        if (sortBy === 'price') return a.price - b.price;
        if (sortBy === 'rating') return b.rating - a.rating;
        return 0;
      });
  }, [printShops, searchQuery, sortBy]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login', { replace: true });
  };

  const handleFileSelect = async (files: FileList) => {
    const getPageCount = async (file: File): Promise<number> => {
      if (file.type !== 'application/pdf') return 1;
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        return pdf.numPages;
      } catch { return 1; }
    };

    const newJobs = await Promise.all(
      Array.from(files).map(async file => ({
        id: uuidv4(),
        file,
        copies: 1,
        isColor: false,
        pageCount: await getPageCount(file),
      }))
    );
    setPrintJobs(prev => [...prev, ...newJobs]);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Dynamic Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white/80 backdrop-blur-xl border-b border-gray-100 py-3 shadow-sm' : 'bg-transparent py-5'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-200">
                <Printer className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">QuickXerox</h1>
                <p className="hidden sm:block text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-1">Print Anywhere</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full border border-gray-200">
                <MapPin className="h-3.5 w-3.5 text-blue-600 font-bold" />
                <span className="text-xs font-bold text-gray-600 truncate max-w-[120px]">{userLocation}</span>
              </div>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsNotificationCenterOpen(true)}
                  className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  {notificationCount > 0 && (
                    <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center ring-2 ring-white">
                      {notificationCount}
                    </span>
                  )}
                </button>
                <CartButton itemCount={printJobs.length} onClick={() => setIsCartOpen(true)} />
                <button
                  onClick={() => navigate('/account')}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                  aria-label="Account"
                >
                  <UserIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="h-6 w-px bg-gray-200 hidden sm:block" />

              <button
                onClick={handleLogout}
                className="hidden sm:flex items-center gap-2 pl-2 text-xs font-bold text-gray-500 hover:text-red-600 transition-all uppercase tracking-wider"
              >
                Logout
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-24 sm:pt-32 pb-20">
        {/* Modern Hero & Search */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 sm:mb-20">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold uppercase tracking-widest mb-6 border border-blue-100">
              <Sparkles className="h-3.5 w-3.5" />
              Smart Printing for Everyone
            </div>
            <h2 className="text-3xl sm:text-6xl font-black text-gray-900 mb-6 tracking-tight">
              Documents ready in <span className="text-blue-600">minutes.</span>
            </h2>
            <p className="text-sm sm:text-lg text-gray-500 max-w-2xl mx-auto font-medium">
              Upload once, print anywhere. Trusted by over 1,000 users and 50+ local print shops near you.
            </p>
          </motion.div>

          {/* Centered Upload Area */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="max-w-4xl mx-auto mb-16"
          >
            <div className="bg-white rounded-[2.5rem] p-4 sm:p-6 shadow-2xl shadow-gray-200 border border-gray-100">
              <FileUpload onFileSelect={handleFileSelect} />
              
              <AnimatePresence>
                {printJobs.length > 0 && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-8 border-t border-gray-50 mt-8">
                      <div className="flex items-center justify-between mb-6">
                        <h4 className="text-sm font-black uppercase tracking-widest text-gray-400">Your Print List</h4>
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-full">{printJobs.length} Files</span>
                      </div>
                      <PrintJobList
                        jobs={printJobs}
                        onUpdateJob={(j) => setPrintJobs(p => p.map(job => job.id === j.id ? j : job))}
                        onRemoveJob={(id) => setPrintJobs(p => p.filter(job => job.id !== id))}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Advanced Shop Filters */}
          <div className="sticky top-[80px] z-40 bg-[#F8FAFC]/80 backdrop-blur-lg pt-4 pb-6 mt-12 sm:mt-24">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="relative w-full md:max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input 
                  type="text"
                  placeholder="Search for a specific print shop..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 no-scrollbar w-full md:w-auto">
                <div className="flex items-center gap-2 mr-2 text-gray-400">
                  <SlidersHorizontal className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Sort by</span>
                </div>
                {(['distance', 'rating', 'price'] as SortOption[]).map((option) => (
                  <button
                    key={option}
                    onClick={() => setSortBy(option)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                      sortBy === option 
                        ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-100' 
                        : 'bg-white text-gray-500 border-gray-100 hover:border-gray-300'
                    }`}
                  >
                    {option === 'distance' ? 'Closest First' : option === 'rating' ? 'Highest Rated' : 'Lowest Price'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Dynamic Shops Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatePresence mode="popLayout">
              {isLoadingShops ? (
                Array(6).fill(0).map((_, i) => (
                  <motion.div key={`skeleton-${i}`} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <Skeleton width="100%" height={176} />
                    <div className="p-5 space-y-3">
                      <div className="flex justify-between items-start">
                        <Skeleton width="60%" height={24} />
                        <Skeleton width="20%" height={24} />
                      </div>
                      <Skeleton width="40%" height={16} />
                      <div className="pt-4 border-t border-gray-50 flex justify-between items-center">
                        <Skeleton width="30%" height={28} />
                        <Skeleton width="35%" height={36} borderRadius="12px" />
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : filteredShops.length > 0 ? (
                filteredShops.map((shop) => (
                  <PrintShopCard
                    key={shop.id}
                    shop={shop}
                    isSelected={selectedShop?.id === shop.id}
                    onSelect={() => {
                      setSelectedShop(shop);
                      if (printJobs.length > 0) setIsCartOpen(true);
                      else toast.error('Add a file first to select a shop!', { icon: '📄' });
                    }}
                  />
                ))
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full py-20 text-center">
                  <div className="inline-flex p-6 bg-white rounded-full shadow-xl mb-6">
                    <Search className="h-10 w-10 text-gray-300" />
                  </div>
                  <h4 className="text-xl font-bold text-gray-900 mb-2">No shops found</h4>
                  <p className="text-gray-500 max-w-xs mx-auto">Try adjusting your search query or location settings.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Benefits Cards */}
        <div className="bg-blue-600 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="bg-white/10 backdrop-blur-lg rounded-[2rem] p-8 border border-white/20">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-xl">
                  <Zap className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Instant Pickup</h3>
                <p className="text-blue-100 text-sm leading-relaxed font-medium">Our shops prioritize your orders. Get documents in as little as 10 minutes from approval.</p>
              </div>
              <div className="bg-white/10 backdrop-blur-lg rounded-[2rem] p-8 border border-white/20">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-xl">
                  <Star className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Verified Shops</h3>
                <p className="text-blue-100 text-sm leading-relaxed font-medium">All our partners are vetted for quality and service to ensure you get the best print every time.</p>
              </div>
              <div className="bg-white/10 backdrop-blur-lg rounded-[2rem] p-8 border border-white/20">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-xl">
                  <CreditCard className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Seamless Pay</h3>
                <p className="text-blue-100 text-sm leading-relaxed font-medium">Multiple payment modes including UPI, cards, and wallets. Pay only when your order is ready.</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Persistence Elements */}
      <FloatingCartButton 
        itemCount={printJobs.length} 
        onClick={() => setIsCartOpen(true)} 
        isVisible={showFloatingCart && printJobs.length > 0} 
      />
      <NotificationCenter isOpen={isNotificationCenterOpen} onClose={() => setIsNotificationCenterOpen(false)} />
      
      <Cart
        items={printJobs}
        onRemove={(id) => setPrintJobs(p => p.filter(job => job.id !== id))}
        basePrice={selectedShop?.price || 3.5}
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        selectedShop={selectedShop}
        onShopSelect={(id) => setSelectedShop(printShops.find(s => s.id === id) || null)}
        shops={printShops}
        userProfile={profile}
      />

      {/* Analysis Modal Overlay */}
      <AnimatePresence>
        {selectedFileForAnalysis && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          >
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[2rem] max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
              <div className="p-8 h-full flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-black text-gray-900">AI Document Intelligence</h3>
                  <button onClick={() => setSelectedFileForAnalysis(null)} className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-400 hover:text-gray-900"><X /></button>
                </div>
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  <DocumentAnalyzer 
                    file={selectedFileForAnalysis} 
                    onAnalysisComplete={(a) => { console.log(a); toast.success('Insight generated!'); }}
                    onOptimize={(f) => {
                      setPrintJobs(p => p.map(j => j.file.name === selectedFileForAnalysis.name ? { ...j, file: f } : j));
                      setSelectedFileForAnalysis(null);
                      toast.success('Document Optimized!');
                    }} 
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 10px; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

export default CustomerDashboard;

