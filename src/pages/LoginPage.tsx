import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Printer, User, ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, sendPasswordResetEmail, sendEmailVerification } from 'firebase/auth';
import { auth, provider, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UserProfile } from '../types/profile';
import { useProfile } from '../hooks/useProfile';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lastLoginAttempt, setLastLoginAttempt] = useState<Date | null>(null);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  // Get the return URL from location state or default to customer dashboard
  const from = (location.state as any)?.from?.pathname || '/customerdashboard';

  // Use useProfile hook
  const { refreshProfile } = useProfile();

  useEffect(() => {
    // Check for saved credentials
    const savedEmail = localStorage.getItem('rememberedEmail');
    const savedName = localStorage.getItem('rememberedName');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
    if (savedName) {
      setName(savedName);
    }
  }, []);

  const handleEmailPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Please enter both email and password.');
      return;
    }

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
      if (isLogin) {
        // Handle login
        const result = await signInWithEmailAndPassword(auth, email, password);
        const user = result.user;

        // Check if email is verified
        if (!user.emailVerified) {
          // Send verification email again
          await sendEmailVerification(user);
          toast.error('Please verify your email address before logging in. A new verification email has been sent.');
          setIsLoading(false);
          return;
        }

        // Set authentication state
        localStorage.setItem('isAuthenticated', 'true');

        // Fetch user profile
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          // Store in sessionStorage
          sessionStorage.setItem('userProfile', JSON.stringify(userData));
          sessionStorage.setItem('userName', userData.name);
          sessionStorage.setItem('userEmail', userData.email);

          // Update last login time
          await setDoc(userRef, {
            lastLogin: new Date().toISOString()
          }, { merge: true });

          // Refresh profile data
          await refreshProfile(user.uid);

          // Handle remember me
          if (rememberMe) {
            localStorage.setItem('rememberedEmail', email);
          } else {
            localStorage.removeItem('rememberedEmail');
          }

          toast.success('🎉 Welcome back! Login successful!');
          
          // Add a small delay before navigation to ensure state updates are complete
          setTimeout(() => {
            try {
              navigate('/customerdashboard', { replace: true });
            } catch (error) {
              console.error('Navigation error:', error);
              toast.error('Failed to navigate to dashboard. Please try again.');
            }
          }, 100);
        } else {
          toast.error('User profile not found. Please try again.');
          setIsLoading(false);
        }
      } else {
        // Handle registration
        if (!name.trim()) {
          toast.error('Please enter your name.');
          return;
        }

        const result = await createUserWithEmailAndPassword(auth, email, password);
        const user = result.user;

        // Set authentication state
        localStorage.setItem('isAuthenticated', 'true');

        // Create initial profile
        const initialProfile = {
          name: name,
          email: email,
          mobile: '',
          address: '',
          city: '',
          state: '',
          pincode: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Store user data in Firebase
        await setDoc(doc(db, 'users', user.uid), {
          ...initialProfile,
          role: 'customer',
          lastLogin: new Date().toISOString(),
          isActive: true
        });

        // Store in sessionStorage
        sessionStorage.setItem('userProfile', JSON.stringify(initialProfile));
        sessionStorage.setItem('userName', name);
        sessionStorage.setItem('userEmail', email);

        // Send email verification
        await sendEmailVerification(user);
        toast.success('🎉 Verification email sent! Please check your inbox and verify your email address before logging in.');

        // Handle remember me
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', email);
          localStorage.setItem('rememberedName', name);
        }

        toast.success('🎉 Account created successfully! Please verify your email to log in.');
        
        // Don't navigate to dashboard - user needs to verify email first
        setIsLoading(false);
        return;
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      let errorMessage = 'Authentication failed. Please try again.';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password.';
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account already exists with this email.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters long.';
      }
      
      toast.error(errorMessage);
      setLoginAttempts(prev => prev + 1);
      setLastLoginAttempt(new Date());
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if email is verified for Google login
      if (!user.emailVerified) {
        // Send verification email
        await sendEmailVerification(user);
        toast.error('Please verify your email address before logging in. A new verification email has been sent.');
        setIsLoading(false);
        return;
      }

      // Check if user exists in Firestore
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);

      let initialProfile: UserProfile;
      
      if (userDoc.exists()) {
        const existingData = userDoc.data();
        initialProfile = {
          name: user.displayName || existingData.name || '',
          email: user.email || '',
          mobile: existingData.mobile || '',
          address: existingData.address || '',
          city: existingData.city || '',
          state: existingData.state || '',
          pincode: existingData.pincode || '',
          createdAt: existingData.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      } else {
        initialProfile = {
          name: user.displayName || '',
          email: user.email || '',
          mobile: '',
          address: '',
          city: '',
          state: '',
          pincode: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }

      // Store authentication state
      localStorage.setItem('isAuthenticated', 'true');
      sessionStorage.setItem('userName', initialProfile.name);
      sessionStorage.setItem('userEmail', initialProfile.email);
      sessionStorage.setItem('userProfile', JSON.stringify(initialProfile));

      // Update user data in Firebase
      await setDoc(userRef, {
        ...initialProfile,
        role: 'customer',
        lastLogin: new Date().toISOString(),
        isActive: true
      }, { merge: true });

      // Refresh profile data
      await refreshProfile(user.uid);

      toast.success('🎉 Welcome! Google login successful!');
      navigate('/customerdashboard', { replace: true });
    } catch (error: any) {
      console.error('Google login error:', error);
      let errorMessage = 'Google login failed. Please try again.';
      
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Login cancelled. Please try again.';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Popup was blocked. Please allow popups for this site.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection.';
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetEmail) {
      toast.error('Please enter your email address.');
      return;
    }

    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      toast.success('Password reset email sent! Please check your inbox.');
      setIsResetPasswordModalOpen(false);
      setResetEmail('');
    } catch (error: any) {
      console.error('Password reset error:', error);
      let errorMessage = 'Failed to send reset email. Please try again.';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many attempts. Please try again later.';
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md bg-white p-8 rounded-2xl shadow-xl transform transition-all duration-300 hover:scale-[1.01]">
        <div className="flex justify-center mb-6">
          <Printer className="h-14 w-14 text-blue-600 animate-pulse-slow" />
        </div>
        <h2 className="mt-2 text-center text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-2">
          QuickXerox
        </h2>
        <p className="text-center text-base sm:text-lg text-gray-600 mb-8">
          {isLogin ? 'Welcome back! Please sign in.' : 'Join us! Create your account.'}
        </p>

        <form className="space-y-6" onSubmit={handleEmailPasswordLogin}>
          {!isLogin && (
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <div className="mt-1 relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 block w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors duration-200"
                  placeholder="John Doe"
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <div className="mt-1 relative rounded-lg shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 block w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors duration-200"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="mt-1 relative rounded-lg shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 block w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors duration-200"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 transition-colors duration-200"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {isLogin && (
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-colors duration-200"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                    Remember me
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => setIsResetPasswordModalOpen(true)}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors duration-200"
                >
                  Forgot password?
                </button>
              </div>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-200 transform hover:-translate-y-0.5"
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (isLogin ? 'Sign in' : 'Create account')}
              {!isLoading && <ArrowRight className="ml-2 h-5 w-5" />}
            </button>
          </div>
        </form>

        <div className="mt-8">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white text-gray-500 font-medium">
                Or continue with
              </span>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              type="button"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-100 shadow-sm transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
            >
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google"
                className="w-6 h-6"
              />
              <span className="text-base font-medium">Continue with Google</span>
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setPassword('');
            }}
            disabled={isLoading}
            type="button"
            className="text-blue-600 hover:text-blue-700 text-base font-medium transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLogin ? 'Create new account' : 'Sign in with existing account'}
          </button>
        </div>
      </div>

      {/* Reset Password Modal */}
      {isResetPasswordModalOpen && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-70 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl p-6 sm:p-8 max-w-md w-full shadow-2xl transform scale-95 animate-scale-in">
            <h3 className="text-2xl font-bold text-gray-900 mb-5 text-center">
              Reset Password
            </h3>
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email address
                </label>
                <div className="mt-1 relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="reset-email"
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="pl-10 block w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors duration-200"
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsResetPasswordModalOpen(false);
                    setResetEmail('');
                  }}
                  className="px-4 py-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-3 text-base font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {isLoading ? (
                    <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : ('Send Reset Link')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
