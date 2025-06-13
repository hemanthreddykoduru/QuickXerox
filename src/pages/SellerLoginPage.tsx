import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer, Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
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

        toast.success('Login successful!');
        navigate('/seller');
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
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full md:max-w-md">
        <div className="flex justify-center">
          <Printer className="h-10 w-10 sm:h-12 sm:w-12 text-blue-600" />
        </div>
        <h2 className="mt-4 sm:mt-6 text-center text-2xl sm:text-3xl font-extrabold text-gray-900">
          QuickXerox Partner
        </h2>
        <p className="mt-1 sm:mt-2 text-center text-sm sm:text-base text-gray-600">
          Sign in to your print shop dashboard
        </p>
      </div>

      <div className="mt-6 sm:mt-8 sm:mx-auto sm:w-full md:max-w-md">
        <div className="bg-white py-6 px-4 shadow sm:rounded-lg sm:px-8">
          <form className="space-y-6" onSubmit={handleSubmit} autoComplete="on" method="post">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 block w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="shop@example.com"
                  disabled={isLoading}
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 block w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="••••••••"
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500"
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

            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={isLoading}
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                Remember me
              </label>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                  <ArrowRight className="h-5 w-5 text-blue-500 group-hover:text-blue-400" />
                </span>
                {isLoading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>

          <div className="mt-4 sm:mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Want to become a partner?
                </span>
              </div>
            </div>

            <div className="mt-4 sm:mt-6 text-center">
              <a
                href="mailto:workwithquickxerox@gmail.com"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
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