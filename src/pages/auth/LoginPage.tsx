import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Mail, MapPin, Phone, Github } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, sendPasswordResetEmail, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { auth, provider, githubProvider, db } from '../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UserProfile } from '../../types/profile';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialMode = searchParams.get('mode');
  const [isLogin, setIsLogin] = useState(initialMode !== 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const allowedDomains = ['@gmail.com', '@gitam.in', '@yahoo.com', '@outlook.com'];

  const sendCustomVerificationEmail = async (user: any, userName: string) => {
    try {
      await fetch('https://quickxerox-api.vercel.app/api/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          name: userName || user.displayName || 'Customer'
        })
      });
    } catch (e) {
      console.error('Failed to send custom verification email:', e);
    }
  };

  const validateEmailDomain = (email: string) => {
    return allowedDomains.some(domain => email.trim().toLowerCase().endsWith(domain));
  };
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  // Rate limiting stored in sessionStorage so it survives page refresh
  const [loginAttempts, setLoginAttempts] = useState(() =>
    parseInt(sessionStorage.getItem('loginAttempts') || '0', 10)
  );
  const [lastLoginAttempt, setLastLoginAttempt] = useState<Date | null>(() => {
    const ts = sessionStorage.getItem('lastLoginAttempt');
    return ts ? new Date(parseInt(ts, 10)) : null;
  });
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  useEffect(() => {
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

    if (loginAttempts >= 3 && lastLoginAttempt) {
      const timeDiff = new Date().getTime() - lastLoginAttempt.getTime();
      if (timeDiff < 300000) {
        const minutesLeft = Math.ceil((300000 - timeDiff) / 60000);
        toast.error(`Too many attempts. Please try again in ${minutesLeft} minutes.`);
        return;
      }
      // Lockout window expired — reset
      setLoginAttempts(0);
      sessionStorage.removeItem('loginAttempts');
      sessionStorage.removeItem('lastLoginAttempt');
    }

    setIsLoading(true);
    setLoadingStep('Authenticating...');
    try {
      // Enable Firebase Auth persistence across browser sessions
      await setPersistence(auth, browserLocalPersistence);

      if (isLogin) {
        const result = await signInWithEmailAndPassword(auth, email, password);
        const user = result.user;

        if (!user.emailVerified) {
          setLoadingStep('Sending verification email...');
          await sendCustomVerificationEmail(user, name);
          toast.error('Please verify your email address before logging in. A new verification email has been sent.');
          setIsLoading(false);
          setLoadingStep('');
          return;
        }

        setLoadingStep('Loading profile...');
        localStorage.setItem('isAuthenticated', 'true');

        const userRef = doc(db, 'users', user.uid);
        const [userDoc] = await Promise.all([
          getDoc(userRef),
          setDoc(userRef, { lastLogin: new Date().toISOString() }, { merge: true })
        ]);

        if (userDoc.exists()) {
          const userData = userDoc.data();

          const userSessionData = {
            userProfile: JSON.stringify(userData),
            userName: userData.name,
            userEmail: userData.email,
            userPhone: userData.mobile || ''
          };
          Object.entries(userSessionData).forEach(([key, value]) => {
            sessionStorage.setItem(key, value);
          });

          if (rememberMe) {
            localStorage.setItem('rememberedEmail', email);
          } else {
            localStorage.removeItem('rememberedEmail');
          }

          toast.success('🎉 Welcome back! Login successful!');
          navigate('/customerdashboard', { replace: true });
        } else {
          toast.error('User profile not found. Please try again.');
          setIsLoading(false);
        }
      } else {
        if (!name.trim()) {
          toast.error('Please enter your name.');
          return;
        }

        if (!validateEmailDomain(email)) {
          toast.error('Only Gmail (@gmail.com), Gitam (@gitam.in), Yahoo, and Outlook emails are allowed.');
          setIsLoading(false);
          return;
        }

        const result = await createUserWithEmailAndPassword(auth, email, password);
        const user = result.user;

        localStorage.setItem('isAuthenticated', 'true');

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

        await setDoc(doc(db, 'users', user.uid), {
          ...initialProfile,
          role: 'customer',
          lastLogin: new Date().toISOString(),
          isActive: true
        });

        sessionStorage.setItem('userProfile', JSON.stringify(initialProfile));
        sessionStorage.setItem('userName', name);
        sessionStorage.setItem('userEmail', email);

        await sendCustomVerificationEmail(user, name);
        toast.success('🎉 Verification email sent!.');

        if (rememberMe) {
          localStorage.setItem('rememberedEmail', email);
          localStorage.setItem('rememberedName', name);
        }

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
      const newAttempts = loginAttempts + 1;
      const now = new Date();
      setLoginAttempts(newAttempts);
      setLastLoginAttempt(now);
      // Persist so refresh doesn't reset the lockout
      sessionStorage.setItem('loginAttempts', String(newAttempts));
      sessionStorage.setItem('lastLoginAttempt', String(now.getTime()));
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      setLoadingStep('Connecting to Google...');
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (user.email && !validateEmailDomain(user.email)) {
        await auth.signOut();
        toast.error('Only Gmail (@gmail.com), Gitam (@gitam.in), Yahoo, and Outlook emails are allowed.');
        setIsLoading(false);
        setLoadingStep('');
        return;
      }

      if (!user.emailVerified) {
        setLoadingStep('Sending verification email...');
        await sendCustomVerificationEmail(user, user.displayName || '');
        toast.error('Please verify your email address before logging in. A new verification email has been sent.');
        setIsLoading(false);
        setLoadingStep('');
        return;
      }

      setLoadingStep('Loading profile...');
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

      const userSessionData = {
        userName: initialProfile.name,
        userEmail: initialProfile.email,
        userProfile: JSON.stringify(initialProfile)
      };

      await Promise.all([
        setDoc(userRef, {
          ...initialProfile,
          role: 'customer',
          lastLogin: new Date().toISOString(),
          isActive: true
        }, { merge: true }),
        Promise.resolve(localStorage.setItem('isAuthenticated', 'true')),
        ...Object.entries(userSessionData).map(([key, value]) =>
          Promise.resolve(sessionStorage.setItem(key, value))
        )
      ]);

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

  const handleGithubLogin = async () => {
    try {
      setIsLoading(true);
      setLoadingStep('Connecting to GitHub...');
      const result = await signInWithPopup(auth, githubProvider);
      const user = result.user;

      if (user.email && !validateEmailDomain(user.email)) {
        await auth.signOut();
        toast.error('Only Gmail (@gmail.com), Gitam (@gitam.in), Yahoo, and Outlook emails are allowed.');
        setIsLoading(false);
        setLoadingStep('');
        return;
      }

      if (!user.emailVerified) {
        if (user.providerData[0].providerId === 'password') {
          setLoadingStep('Sending verification email...');
          await sendCustomVerificationEmail(user, user.displayName || '');
          toast.error('Please verify your email address before logging in. A new verification email has been sent.');
          setIsLoading(false);
          setLoadingStep('');
          return;
        }
      }

      setLoadingStep('Loading profile...');
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

      const userSessionData = {
        userName: initialProfile.name,
        userEmail: initialProfile.email,
        userProfile: JSON.stringify(initialProfile)
      };

      await Promise.all([
        setDoc(userRef, {
          ...initialProfile,
          role: 'customer',
          lastLogin: new Date().toISOString(),
          isActive: true
        }, { merge: true }),
        Promise.resolve(localStorage.setItem('isAuthenticated', 'true')),
        ...Object.entries(userSessionData).map(([key, value]) =>
          Promise.resolve(sessionStorage.setItem(key, value))
        )
      ]);

      toast.success('🎉 Welcome! GitHub login successful!');
      navigate('/customerdashboard', { replace: true });
    } catch (error: any) {
      console.error('GitHub login error:', error);
      let errorMessage = 'GitHub login failed. Please try again.';

      if (error.code === 'auth/account-exists-with-different-credential') {
        errorMessage = 'An account already exists with the same email address. Please sign in with Google or Email/Password.';
      } else if (error.code === 'auth/popup-closed-by-user') {
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
    <div className="min-h-screen flex flex-col bg-white">
      {/* Navbar */}
      <nav className="border-b border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/favicon.svg" alt="QuickXerox" className="h-8 w-8" />
            <span className="text-xl font-black text-slate-900 tracking-tight">QuickXerox</span>
          </div>
          <button
            onClick={() => {
              setIsLogin(true);
              navigate('/login');
            }}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Login
          </button>
        </div>
      </nav>

      <main className="flex-1 flex flex-col lg:flex-row">
        {/* Left Side - Hero/Welcome */}
        {/* Left Side - Hero/Welcome */}
        <div className="w-full lg:w-1/2 bg-white relative overflow-hidden flex flex-col items-center justify-center p-8 lg:p-12 text-center lg:min-h-[600px]">
          <div className="relative z-10 max-w-lg">
            <h1 className="text-3xl lg:text-5xl font-extrabold text-gray-900 mb-6 font-display">
              {isLogin ? 'Welcome Back!' : 'Start Printing Now'}
            </h1>
            <p className="text-base lg:text-lg text-gray-600 mb-8 lg:mb-12 leading-relaxed">
              {isLogin
                ? 'Sign in to access your dashboard, track orders, and experience the fastest printing service.'
                : 'Join QuickXerox today to upload files from anywhere and pick them up at your convenience.'}
            </p>

            {/* Visual Decoration */}
            <div className="relative mt-12 flex justify-center">
              <div className="relative transform hover:scale-105 transition-transform duration-500 ease-out">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 rounded-full scale-150"></div>

                <div className="flex flex-col items-center">
                  <img src="/favicon.svg" alt="QuickXerox" className="w-48 h-48 lg:w-64 lg:h-64 drop-shadow-xl" />
                </div>
              </div>
            </div>
          </div>

          {/* Subtle background gradients, less intrusive */}
          <div className="absolute top-[-10%] left-[-10%] w-[300px] h-[300px] lg:w-[500px] lg:h-[500px] bg-blue-200/30 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[300px] h-[300px] lg:w-[500px] lg:h-[500px] bg-indigo-200/30 rounded-full blur-3xl pointer-events-none"></div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full lg:w-1/2 bg-white flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md space-y-8">
            <div className="text-left">
              <h2 className="text-3xl font-bold text-gray-900 mt-0">
                {isLogin ? 'Sign in to your account' : 'Create your account'}
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setPassword('');
                  }}
                  className="font-medium text-blue-600 hover:text-blue-500 hover:underline transition-colors"
                >
                  {isLogin ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </div>

            <form className="mt-8 space-y-6" onSubmit={handleEmailPasswordLogin}>
              {!isLogin && (
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="John Doe"
                  />
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                      Remember me
                    </label>
                  </div>

                  {isLogin && (
                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => setIsResetPasswordModalOpen(true)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-500"
                      >
                        Forgot your password?
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-lg shadow-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 transform hover:-translate-y-0.5"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-2 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {loadingStep || (isLogin ? 'Signing In...' : 'Creating Account...')}
                  </>
                ) : (isLogin ? 'Sign In' : 'Sign Up')}
              </button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">
                    Or continue with
                  </span>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <button
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  type="button"
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-200 rounded-lg bg-white text-gray-700 hover:bg-gray-50 font-medium transition-all duration-200"
                >
                  <img
                    src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                    alt="Google"
                    className="w-5 h-5"
                  />
                  <span>Sign in with Google</span>
                </button>

                <button
                  onClick={handleGithubLogin}
                  disabled={isLoading}
                  type="button"
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-transparent rounded-lg bg-[#24292e] text-white hover:bg-[#2f363d] font-medium transition-all duration-200"
                >
                  <Github className="w-5 h-5" />
                  <span>Sign in with GitHub</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img src="/favicon.svg" alt="QuickXerox" className="h-7 w-7" />
                <h3 className="text-lg font-black text-slate-900">QuickXerox</h3>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed">
                Your one-stop destination for fast, reliable, and secure printing services.
                Upload files from anywhere and collect them from your nearest shop.
              </p>
              <div className="flex space-x-4 mt-6">
                {/* Social Placeholders if needed */}
              </div>
            </div>



            <div>
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Support</h4>
              <ul className="space-y-3 text-sm text-gray-600">
                <li><Link to="/contact" className="hover:text-blue-600 transition-colors">Contact Us</Link></li>
                <li><Link to="/terms" className="hover:text-blue-600 transition-colors">Terms of Service</Link></li>
                <li><Link to="/privacy" className="hover:text-blue-600 transition-colors">Privacy Policy</Link></li>
                <li><Link to="/refund" className="hover:text-blue-600 transition-colors">Refund Policy</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Contact</h4>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start">
                  <MapPin className="h-5 w-5 mr-2 text-blue-600 shrink-0" />
                  <span>Gitam University, Bengaluru, India</span>
                </li>
                <li className="flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-blue-600 shrink-0" />
                  <span>+91 9876543210</span>
                </li>
                <li className="flex items-center">
                  <Mail className="h-4 w-4 mr-2 text-blue-600 shrink-0" />
                  <a href="mailto:help-contact@quickxerox.app" className="hover:text-blue-600">help-contact@quickxerox.app</a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-8 text-center text-sm text-gray-500">
            <p>&copy; {new Date().getFullYear()} QuickXerox. All rights reserved.</p>
            <p className="mt-2 text-xs text-gray-400">Owned & Operated by Hemanth Reddy Koduru</p>
          </div>
        </div>
      </footer>

      {/* Reset Password Modal */}
      {isResetPasswordModalOpen && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 lg:p-8 max-w-md w-full shadow-2xl">
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
                  Send Reset Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .perspective-1000 {
          perspective: 1000px;
        }
        .rotate-y-12 {
          transform: rotateY(12deg);
        }
        .-rotate-y-12 {
          transform: rotateY(-12deg);
        }
        .rotate-x-12 {
          transform: rotateX(12deg);
        }
        .translate-z-12 {
          transform: translateZ(20px);
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) rotateY(12deg) rotateX(12deg); }
          50% { transform: translateY(-10px) rotateY(12deg) rotateX(12deg); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
