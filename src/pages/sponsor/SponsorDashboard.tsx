import React, { useState, useEffect } from 'react';
import { 
  Megaphone, Users, LogOut, Plus, Image, Globe, Tag, 
  MapPin, DollarSign, Loader2, Pause, Play, CheckCircle2, 
  X, Clock, Eye
} from 'lucide-react';
import { auth, db } from '../../firebase';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { 
  collection, query, where, onSnapshot, addDoc, doc, 
  updateDoc, getDoc, serverTimestamp, getDocs
} from 'firebase/firestore';
import { uploadSponsorBanner, getSignedUrl } from '../../services/storageService';
import { toast } from 'react-hot-toast';
import { createPayment, verifyPayment } from '../../services/paymentService';

interface Campaign {
  id: string;
  name: string;
  brandName: string;
  websiteUrl: string;
  ctaText: string;
  placementType: 'footer' | 'cover' | 'watermark' | 'coupon';
  locations: string[];
  budget: number;
  spent: number;
  bannerPath: string;
  bannerUrl?: string;
  impressions: number;
  status: 'created' | 'pending_approval' | 'active' | 'paused' | 'completed';
  isPaid: boolean;
  createdAt: any;
  updatedAt: any;
}

const PLACEMENT_DETAILS = {
  footer: { label: 'Footer Banner', price: 0.50, desc: 'Sleek ad printed at the bottom margins of notes/reports.' },
  cover: { label: 'First Page Cover', price: 1.50, desc: 'Premium wide banner featured on the front page.' },
  watermark: { label: 'Page Watermark', price: 1.00, desc: 'Semi-transparent background brand watermark across pages.' },
  coupon: { label: 'Separator Coupon Page', price: 2.00, desc: 'Standalone full ad page with direct coupons.' }
};

const DEFAULT_LOCATIONS = [
  'GITAM University, Vizag',
  'GITAM University, Hyderabad',
  'Rishikonda Student Hub',
  'MVP Colony Print Shops',
  'Bhimavaram Campus Zone',
  'Vizag City Center'
];

declare global {
  interface Window {
    Razorpay: any;
  }
}

const SponsorDashboard = () => {
  const navigate = useNavigate();
  const [sponsorName, setSponsorName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [availableLocations, setAvailableLocations] = useState<string[]>(DEFAULT_LOCATIONS);

  useEffect(() => {
    const fetchDynamicShops = async () => {
      try {
        const shopsSnap = await getDocs(collection(db, 'shopOwners'));
        const list: string[] = [];
        shopsSnap.forEach((doc) => {
          const data = doc.data();
          const shopName = data.settings?.shop?.name || data.shopName || data.name;
          const shopAddress = data.settings?.shop?.address || data.address;
          if (shopName) {
            const label = shopAddress ? `${shopName} - ${shopAddress}` : shopName;
            list.push(label);
          }
        });
        if (list.length > 0) {
          setAvailableLocations(list);
        }
      } catch (err) {
        console.error('Error loading shop locations for sponsor targeting:', err);
      }
    };
    fetchDynamicShops();
  }, []);

  // Campaign creation modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [campName, setCampName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [ctaText, setCtaText] = useState('Scan & Get Offer');
  const [placementType, setPlacementType] = useState<'footer' | 'cover' | 'watermark' | 'coupon'>('footer');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [budget, setBudget] = useState(1000);
  
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string>('');
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  
  // Payment states
  const [isPaying, setIsPaying] = useState(false);
  const [paymentStep, setPaymentStep] = useState('');
  const [checkoutMode, setCheckoutMode] = useState<'real' | 'mock' | null>(null);

  useEffect(() => {
    const fetchSponsorProfile = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const docRef = doc(db, 'sponsors', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSponsorName(docSnap.data().name || '');
          setCompanyName(docSnap.data().companyName || '');
          setBrandName(docSnap.data().companyName || '');
        }
      } catch (err) {
        console.error('Error fetching sponsor details:', err);
      }
    };

    fetchSponsorProfile();
  }, []);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    setIsLoading(true);
    const q = query(
      collection(db, 'campaigns'),
      where('sponsorId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const rawList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Campaign[];
      
      // Resolve signed URL for each campaign banner path
      const resolvedList = await Promise.all(rawList.map(async (camp) => {
        if (camp.bannerPath) {
          try {
            const url = await getSignedUrl(camp.bannerPath);
            return { ...camp, bannerUrl: url };
          } catch (e) {
            console.error('Signed URL retrieval failed:', e);
            return camp;
          }
        }
        return camp;
      }));

      // Sort by creation date descending
      resolvedList.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });

      setCampaigns(resolvedList);
      setIsLoading(false);
    }, (err) => {
      console.error('Campaigns snapshot error:', err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem('isSponsorAuthenticated');
    localStorage.removeItem('sponsorId');
    navigate('/sponsor/login');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBannerFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleCreateCampaign = async (mode: 'real' | 'mock') => {
    if (!campName.trim() || !brandName.trim()) {
      toast.error('Please enter Campaign Name and Brand Name');
      return;
    }
    if (!bannerFile) {
      toast.error('Please select an ad banner creative.');
      return;
    }
    if (selectedLocations.length === 0) {
      toast.error('Please select at least one target location.');
      return;
    }
    if (budget < 500) {
      toast.error('Minimum campaign budget is ₹500.');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      toast.error('Session expired. Please log in again.');
      return;
    }

    setIsPaying(true);
    setCheckoutMode(mode);

    try {
      // 1. Upload Banner to Supabase
      setPaymentStep('Uploading ad banner creative to storage...');
      setIsUploadingBanner(true);
      const bannerPath = await uploadSponsorBanner(bannerFile, user.uid);
      setIsUploadingBanner(false);

      // 2. Pre-create Campaign Record in Firestore (Unpaid status)
      setPaymentStep('Initializing campaign registration...');
      const newCampaignData = {
        sponsorId: user.uid,
        name: campName,
        brandName,
        websiteUrl: websiteUrl.trim(),
        ctaText,
        placementType,
        locations: selectedLocations,
        budget: Number(budget),
        spent: 0,
        bannerPath,
        impressions: 0,
        status: 'created',
        isPaid: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'campaigns'), newCampaignData);
      const campaignId = docRef.id;

      if (mode === 'mock') {
        // 3a. Simulated Mock Payment Portal Flow
        setPaymentStep('Connecting to secure banking gateway...');
        await new Promise(r => setTimeout(r, 1200));
        
        setPaymentStep(`Authorizing transaction of ₹${budget}.00...`);
        await new Promise(r => setTimeout(r, 1000));
        
        setPaymentStep('Validating transaction checksum...');
        await new Promise(r => setTimeout(r, 800));

        // 4a. Update Campaign as Paid & Awaiting Moderation
        setPaymentStep('Securing ad campaign authorization...');
        await updateDoc(doc(db, 'campaigns', campaignId), {
          isPaid: true,
          status: 'pending_approval',
          paidAt: new Date().toISOString(),
          paymentId: `mock_pay_${Math.random().toString(36).substring(2, 10)}`,
          updatedAt: serverTimestamp()
        });

        toast.success('🎉 Sandbox Payment Successful! Campaign submitted for admin approval.');
        closeModal();
      } else {
        // 3b. Real Razorpay Payment Gateway integration
        setPaymentStep('Loading payment gateway...');
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          throw new Error('Razorpay SDK failed to load. Please verify your connection.');
        }

        setPaymentStep('Initiating secure ad budget order...');
        // We use a generic checkout details format using the user profile
        const orderDetails = {
          shopId: 'sponsor_portal',
          items: [{ name: `Ad Campaign: ${campName}`, price: budget, quantity: 1 }],
          currency: 'INR',
          receipt: `CAMP_${campaignId.substring(0, 8)}`,
          userId: user.uid,
          customerName: sponsorName || 'Sponsor',
          customerEmail: user.email || '',
        };

        const orderData = await createPayment(orderDetails);
        if (!orderData) {
          throw new Error('Could not create merchant order. Try sandbox/mock mode.');
        }

        const options = {
          key: orderData.key_id,
          amount: orderData.amount,
          currency: orderData.currency,
          name: 'QuickXerox Sponsor Network',
          description: `Campaign Budget - ${campName}`,
          image: 'https://tkwazltvxdztaunerksd.supabase.co/storage/v1/object/public/assets/Background-Removed.png',
          order_id: orderData.orderId,
          handler: async function (response: any) {
            try {
              setPaymentStep('Verifying payment cryptographic signature...');
              const isVerified = await verifyPayment(
                response.razorpay_payment_id,
                response.razorpay_order_id,
                response.razorpay_signature
              );

              if (isVerified) {
                // Update Firestore
                await updateDoc(doc(db, 'campaigns', campaignId), {
                  isPaid: true,
                  status: 'pending_approval',
                  paidAt: new Date().toISOString(),
                  paymentId: response.razorpay_payment_id,
                  razorpayOrderId: response.razorpay_order_id,
                  updatedAt: serverTimestamp()
                });

                toast.success('🎉 Budget paid successfully! Ad is now awaiting moderation.');
                closeModal();
              } else {
                toast.error('Cryptographic signature verification failed.');
              }
            } catch (err: any) {
              console.error('Payment Verification error:', err);
              toast.error(`Verification error: ${err.message}`);
            }
          },
          prefill: {
            name: sponsorName,
            email: user.email,
          },
          theme: {
            color: '#8b5cf6',
          },
          modal: {
            ondismiss: function () {
              toast.error('Payment cancelled by sponsor.');
              setIsPaying(false);
              setPaymentStep('');
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      }
    } catch (err: any) {
      console.error('Campaign creation error:', err);
      toast.error(err.message || 'Failed to complete campaign creation.');
      setIsUploadingBanner(false);
    } finally {
      setIsPaying(false);
      setCheckoutMode(null);
    }
  };

  const handleToggleCampaignStatus = async (campId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';
      await updateDoc(doc(db, 'campaigns', campId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      toast.success(`Campaign ${newStatus === 'active' ? 'resumed' : 'paused'} successfully!`);
    } catch (err) {
      console.error('Error toggling campaign status:', err);
      toast.error('Failed to update campaign state.');
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCampName('');
    setWebsiteUrl('');
    setCtaText('Scan & Get Offer');
    setPlacementType('footer');
    setSelectedLocations([]);
    setBudget(1000);
    setBannerFile(null);
    setBannerPreview('');
    setIsUploadingBanner(false);
    setIsPaying(false);
    setPaymentStep('');
    setCheckoutMode(null);
  };

  const toggleLocation = (loc: string) => {
    if (selectedLocations.includes(loc)) {
      setSelectedLocations(selectedLocations.filter(l => l !== loc));
    } else {
      setSelectedLocations([...selectedLocations, loc]);
    }
  };

  // Metrics calculations
  const totalImpressions = campaigns.reduce((sum, c) => sum + (c.impressions || 0), 0);
  const activeCampaignsCount = campaigns.filter(c => c.status === 'active').length;
  const totalBudget = campaigns.reduce((sum, c) => sum + (c.budget || 0), 0);
  const totalSpent = campaigns.reduce((sum, c) => sum + (c.spent || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-indigo-50/20 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        
        {/* Sleek Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/70 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-white/20">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-600/20">
              <Megaphone className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                QuickXerox <span className="text-purple-600">Sponsors</span>
              </h1>
              <p className="text-sm text-slate-500 font-medium">
                Welcome back, {sponsorName || 'Advertiser'} {companyName && `(${companyName})`}
              </p>
            </div>
          </div>
          <button 
            onClick={handleLogout} 
            className="flex items-center gap-2 px-5 py-3 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100/80 rounded-xl transition-all shadow-sm"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </header>

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-50 rounded-full group-hover:scale-110 transition-transform duration-300"></div>
            <div className="flex items-center gap-4 mb-4 relative">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Eye className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500">Total Impressions</p>
                <h3 className="text-3xl font-black text-slate-900">{totalImpressions.toLocaleString()}</h3>
              </div>
            </div>
            <div className="text-xs text-slate-400 font-medium">Physical flyer impressions</div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-50 rounded-full group-hover:scale-110 transition-transform duration-300"></div>
            <div className="flex items-center gap-4 mb-4 relative">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500">Active Campaigns</p>
                <h3 className="text-3xl font-black text-slate-900">{activeCampaignsCount}</h3>
              </div>
            </div>
            <div className="text-xs text-slate-400 font-medium">Running on active prints</div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-purple-50 rounded-full group-hover:scale-110 transition-transform duration-300"></div>
            <div className="flex items-center gap-4 mb-4 relative">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500">Total Budget</p>
                <h3 className="text-3xl font-black text-slate-900">₹{totalBudget.toLocaleString()}</h3>
              </div>
            </div>
            <div className="text-xs text-slate-400 font-semibold">
              Spent <span className="text-purple-600 font-extrabold">₹{totalSpent.toLocaleString()}</span> so far
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur p-4 rounded-3xl border-2 border-dashed border-purple-300 flex flex-col justify-center items-center text-center shadow-lg shadow-purple-600/5 relative overflow-hidden group hover:border-purple-500 transition-all hover:scale-[1.01]">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="w-full h-full py-6 flex flex-col items-center justify-center gap-2"
            >
              <div className="w-12 h-12 bg-purple-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-purple-600/30 group-hover:scale-110 transition-all">
                <Plus className="w-6 h-6" />
              </div>
              <span className="font-extrabold text-purple-600 text-sm">Create New Campaign</span>
              <span className="text-xs text-purple-400 font-medium">Fund & target campus flyers</span>
            </button>
          </div>
        </div>

        {/* Campaigns List */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Your Ad Campaigns</h2>
              <p className="text-sm text-slate-500">Track impressions, budgets, and moderator approvals</p>
            </div>
            <div className="text-xs text-slate-400 font-semibold flex items-center gap-1 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
              <Clock className="w-3.5 h-3.5" /> Real-time updates
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col justify-center items-center py-20 gap-3">
              <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
              <p className="text-sm font-semibold text-slate-500">Syncing campaigns...</p>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-3xl max-w-lg mx-auto bg-slate-50/50">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Megaphone className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">No campaigns launched yet</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6 px-4">
                Tap the campaign card above to fund a budget, upload your banner design, and target local student prints.
              </p>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-extrabold px-6 py-3 rounded-xl shadow-md shadow-purple-600/10 transition-all text-sm"
              >
                <Plus className="w-4 h-4" /> Create Your First Campaign
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {campaigns.map((camp) => (
                <div key={camp.id} className="bg-slate-50/60 border border-slate-100 rounded-3xl p-5 flex flex-col sm:flex-row gap-5 relative group hover:shadow-md transition-all">
                  
                  {/* Creative Banner Preview */}
                  <div className="w-full sm:w-40 h-28 bg-slate-200 rounded-2xl overflow-hidden relative border border-slate-100 flex-shrink-0 flex items-center justify-center">
                    {camp.bannerUrl ? (
                      <img src={camp.bannerUrl} alt={camp.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <Image className="w-8 h-8 text-slate-400" />
                    )}
                    <span className="absolute top-2 left-2 text-[10px] bg-slate-900/70 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider backdrop-blur-sm">
                      {camp.placementType}
                    </span>
                  </div>

                  {/* Campaign details */}
                  <div className="flex-grow flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <h4 className="font-extrabold text-slate-900 text-base leading-snug truncate max-w-[180px] sm:max-w-[200px]" title={camp.name}>
                          {camp.name}
                        </h4>
                        
                        {/* Interactive Status badges */}
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          camp.status === 'active' 
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 animate-pulse'
                            : camp.status === 'pending_approval'
                            ? 'bg-amber-100 text-amber-700 border border-amber-200'
                            : camp.status === 'paused'
                            ? 'bg-slate-200 text-slate-600 border border-slate-300'
                            : camp.status === 'completed'
                            ? 'bg-blue-100 text-blue-700 border border-blue-200'
                            : 'bg-red-100 text-red-700 border border-red-200'
                        }`}>
                          {camp.status === 'pending_approval' ? 'Pending Approval' : camp.status}
                        </span>
                      </div>

                      <div className="text-xs text-slate-400 font-bold mb-3 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5" /> {camp.brandName}
                      </div>

                      {/* Locations & Targets */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {camp.locations.slice(0, 2).map((loc, idx) => (
                          <span key={idx} className="text-[10px] font-bold bg-white text-slate-600 border border-slate-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5 text-purple-500" /> {loc.split(',')[0]}
                          </span>
                        ))}
                        {camp.locations.length > 2 && (
                          <span className="text-[10px] font-black text-purple-600 px-1 py-0.5">
                            +{camp.locations.length - 2} more
                          </span>
                        )}
                      </div>

                      {/* Budget spent progress bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-bold text-slate-500">
                          <span>Spent: ₹{camp.spent || 0}</span>
                          <span>Budget: ₹{camp.budget}</span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(((camp.spent || 0) / camp.budget) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* Stats and Action pause trigger */}
                    <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-4">
                        <div>
                          <span className="text-[10px] text-slate-400 font-extrabold uppercase block leading-none">Impressions</span>
                          <span className="text-sm font-black text-slate-900">{(camp.impressions || 0).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-extrabold uppercase block leading-none">Paid</span>
                          <span className={`text-xs font-black ${camp.isPaid ? 'text-emerald-600' : 'text-red-500'}`}>
                            {camp.isPaid ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>

                      {(camp.status === 'active' || camp.status === 'paused') && (
                        <button
                          onClick={() => handleToggleCampaignStatus(camp.id, camp.status)}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all border ${
                            camp.status === 'active'
                              ? 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100'
                              : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'
                          }`}
                        >
                          {camp.status === 'active' ? (
                            <>
                              <Pause className="w-3.5 h-3.5" /> Pause ad
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5" /> Resume ad
                            </>
                          )}
                        </button>
                      )}
                    </div>

                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Slide Overlay Modal: Campaign Creation */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-70 flex items-center justify-center p-4 z-50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 lg:p-8 max-w-2xl w-full shadow-2xl relative border border-slate-100 my-8">
            <button 
              onClick={closeModal} 
              className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-2xl font-black text-slate-900 mb-1 tracking-tight">Create Print Campaign</h3>
            <p className="text-sm text-slate-500 mb-6">Fund an ad wallet to sponsor student printing and target local campuses.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              
              {/* Left Column: Form Details */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Campaign Name</label>
                  <input
                    type="text" required value={campName} onChange={(e) => setCampName(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm bg-slate-50"
                    placeholder="E.g., Summer Discount 20%"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Brand/Company Name</label>
                  <input
                    type="text" required value={brandName} onChange={(e) => setBrandName(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm bg-slate-50"
                    placeholder="Brand display name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Website URL (QR Redirect)</label>
                  <div className="relative">
                    <Globe className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                    <input
                      type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)}
                      className="w-full pl-10 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm bg-slate-50"
                      placeholder="https://example.com/offer"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Ad QR Code Call-To-Action (CTA)</label>
                  <div className="relative">
                    <Tag className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text" value={ctaText} onChange={(e) => setCtaText(e.target.value)}
                      className="w-full pl-10 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm bg-slate-50"
                      placeholder="E.g., Scan & Get 20% Off"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Upload Creative Banner */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Ad Creative Banner</label>
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center bg-slate-50/50 hover:border-purple-500 transition-colors relative h-[180px] flex flex-col justify-center items-center overflow-hidden">
                    {bannerPreview ? (
                      <div className="absolute inset-0 group">
                        <img src={bannerPreview} alt="Ad Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <label htmlFor="modal-banner-input" className="cursor-pointer bg-white text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg shadow border hover:bg-slate-50 transition-colors">
                            Change Banner
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center">
                        <Image className="w-8 h-8 text-slate-400 mb-2" />
                        <span className="text-xs font-bold text-slate-700 mb-0.5">Upload ad image banner</span>
                        <span className="text-[10px] text-slate-400">PNG, JPG up to 5MB</span>
                        <label htmlFor="modal-banner-input" className="mt-3 cursor-pointer inline-flex bg-white border border-slate-200 text-slate-800 text-xs font-bold px-3.5 py-2 rounded-xl hover:bg-slate-50 shadow-sm transition-colors">
                          Choose File
                        </label>
                      </div>
                    )}
                    <input id="modal-banner-input" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Ad Placement Type & Rates</label>
                  <select 
                    value={placementType} 
                    onChange={(e: any) => setPlacementType(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm bg-slate-50 font-bold text-slate-800"
                  >
                    <option value="footer">Footer Banner (₹{PLACEMENT_DETAILS.footer.price.toFixed(2)}/print)</option>
                    <option value="cover">First Page Cover (₹{PLACEMENT_DETAILS.cover.price.toFixed(2)}/print)</option>
                    <option value="watermark">Page Watermark (₹{PLACEMENT_DETAILS.watermark.price.toFixed(2)}/print)</option>
                    <option value="coupon">Dedicated Coupon Page (₹{PLACEMENT_DETAILS.coupon.price.toFixed(2)}/print)</option>
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1 font-semibold">
                    {PLACEMENT_DETAILS[placementType].desc}
                  </p>
                </div>
              </div>
            </div>

            {/* Target Campus Locations */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Target Campus & Locations</label>
              <div className="flex flex-wrap gap-2">
                {availableLocations.map((loc) => {
                  const isSelected = selectedLocations.includes(loc);
                  return (
                    <button
                      key={loc} type="button" onClick={() => toggleLocation(loc)}
                      className={`text-xs font-bold px-4 py-2.5 rounded-xl border transition-all flex items-center gap-1.5 ${
                        isSelected 
                          ? 'bg-purple-100 text-purple-700 border-purple-300 shadow-sm shadow-purple-600/5' 
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <MapPin className={`w-3.5 h-3.5 ${isSelected ? 'text-purple-600' : 'text-slate-400'}`} /> {loc}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Budget Section */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Select Ad Budget (INR)</label>
                <div className="flex gap-2">
                  {[500, 1000, 5000].map((val) => (
                    <button
                      key={val} type="button" onClick={() => setBudget(val)}
                      className={`text-xs font-black px-3.5 py-2 rounded-xl transition-all border ${
                        budget === val 
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm' 
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      ₹{val}
                    </button>
                  ))}
                </div>
              </div>
              <div className="w-full sm:w-44">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Custom Wallet Budget (₹)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-sm font-bold text-slate-500">₹</span>
                  <input
                    type="number" min="500" step="100" value={budget} onChange={(e) => setBudget(Number(e.target.value))}
                    className="w-full pl-7 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm bg-white font-extrabold text-slate-800"
                    placeholder="Min 500"
                  />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row justify-end items-stretch sm:items-center gap-3">
              <button 
                type="button" onClick={closeModal}
                className="px-6 py-3 font-extrabold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors text-sm text-center"
              >
                Cancel
              </button>
              
              {/* Payment Checkout triggers */}
              <button 
                onClick={() => handleCreateCampaign('mock')}
                className="px-6 py-3 font-extrabold text-purple-700 bg-purple-50 border border-purple-200 rounded-xl hover:bg-purple-100 transition-all text-sm flex items-center justify-center gap-2"
              >
                Simulate Sandbox Payment (Mock)
              </button>

              <button 
                onClick={() => handleCreateCampaign('real')}
                className="px-6 py-3 font-extrabold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-all shadow-lg shadow-purple-600/10 text-sm flex items-center justify-center gap-2"
              >
                Pay & Launch via Razorpay
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Secure Payment Overlay Loader */}
      {isPaying && (
        <div className="fixed inset-0 bg-slate-950/80 flex flex-col justify-center items-center z-[100] p-4 backdrop-blur-md">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col items-center text-center space-y-6 relative overflow-hidden">
            
            {/* Background glowing indicator */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-purple-500 to-indigo-500 animate-pulse"></div>

            <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 shadow-inner relative">
              <Loader2 className="w-8 h-8 animate-spin" />
              {isUploadingBanner && (
                <Image className="w-4 h-4 text-purple-400 absolute right-2 bottom-2 animate-bounce" />
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                {checkoutMode === 'mock' ? 'Sandbox Gateway Connection' : 'Securing Ad Placement'}
              </h3>
              <p className="text-sm font-bold text-purple-600 bg-purple-50 px-3 py-1.5 rounded-full inline-block">
                Amount to charge: ₹{budget}.00
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 w-full text-slate-600 text-xs font-semibold space-y-3">
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-extrabold uppercase">
                <span>Task Status</span>
                <span>Active</span>
              </div>
              <div className="flex items-center gap-2.5 text-left text-slate-700 leading-snug">
                <CheckCircle2 className="w-4.5 h-4.5 text-purple-600 flex-shrink-0 animate-pulse" />
                <span>{paymentStep || 'Processing payment order secure key...'}</span>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 font-semibold max-w-xs leading-relaxed">
              Merchant verification secured. Do not close or refresh this tab while transaction validation is active.
            </p>
          </div>
        </div>
      )}

    </div>
  );
};

export default SponsorDashboard;
