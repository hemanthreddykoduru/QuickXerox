import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer, Mail, Lock, ArrowRight, Eye, EyeOff, Building2, Shield } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const SellerLoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lastLoginAttempt, setLastLoginAttempt] = useState<Date | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    // Check for saved credentials
    const savedEmail = localStorage.getItem('sellerRememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check for too many login attempts
    if (loginAttempts >= 3 && lastLoginAttempt) {
      const timeDiff = new Date().getTime() - lastLoginAttempt.getTime();
      if (timeDiff < 300000) { // 5 minutes in milliseconds
        const minutesLeft = Math.ceil((300000 - timeDiff) / 60000);
        toast.error(`Too many attempts. Please try again in ${minutesLeft} minutes.`);
        return;
      }
      setLoginAttempts(0);
    }

    setIsLoading(true);
    try {
      // Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Check if user is a shop owner
      const userDoc = await getDoc(doc(db, 'shopOwners', user.uid));
      
      if (userDoc.exists()) {
        localStorage.setItem('isSellerAuthenticated', 'true');
        localStorage.setItem('sellerId', user.uid);
        
        if (rememberMe) {
          localStorage.setItem('sellerRememberedEmail', email);
        } else {
          localStorage.removeItem('sellerRememberedEmail');
        }

        toast.success('🎉 Welcome back! Seller login successful!');
        navigate('/seller/dashboard');
      } else {
        // Sign out if user is not a shop owner
        await auth.signOut();
        throw new Error('Not authorized as a shop owner');
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Invalid email or password');
      setLoginAttempts(prev => prev + 1);
      setLastLoginAttempt(new Date());
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-400/20 to-blue-400/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/20 transform transition-all duration-300 hover:scale-[1.02]">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <Printer className="h-14 w-14 text-blue-600 animate-pulse-slow" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              QuickXerox Partner
            </h2>
            <p className="text-gray-600 text-lg">
              Sign in to your print shop dashboard
            </p>
            <div className="flex items-center justify-center mt-4 space-x-2 text-sm text-gray-500">
              <Building2 className="h-4 w-4" />
              <span>Business Partner Portal</span>
            </div>
          </div>

          {/* Form */}
          <form className="space-y-6" onSubmit={handleSubmit} autoComplete="on" method="post">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-12 w-full px-4 py-3 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
                  placeholder="shop@example.com"
                  disabled={isLoading}
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-12 w-full px-4 py-3 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
                  placeholder="••••••••"
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-gray-700 transition-colors duration-200"
                  title={showPassword ? "Hide password" : "Show password"}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-colors duration-200"
                  disabled={isLoading}
                />
                <label htmlFor="remember-me" className="ml-3 block text-sm text-gray-700 font-medium">
                  Remember me
                </label>
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <Shield className="h-4 w-4 mr-1" />
                <span>Secure login</span>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-3 px-6 border border-transparent rounded-xl shadow-lg text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 transform hover:-translate-y-0.5"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white/80 text-gray-500 font-medium">
                  Want to become a partner?
                </span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <a
                href="mailto:workwithquickxerox@gmail.com"
                className="inline-flex items-center px-6 py-3 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white/50 backdrop-blur-sm hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
              >
                <Building2 className="h-4 w-4 mr-2" />
                Contact our partnership team
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellerLoginPage;