import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Megaphone, Github, Building2, User } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { auth, db, provider, githubProvider } from '../../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, sendPasswordResetEmail, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const SponsorLoginPage = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  useEffect(() => {
    const savedEmail = localStorage.getItem('sponsorRememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleEmailPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    setLoadingStep('Authenticating...');
    try {
      await setPersistence(auth, browserLocalPersistence);

      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const userDoc = await getDoc(doc(db, 'sponsors', user.uid));
        
        if (userDoc.exists()) {
          localStorage.setItem('isSponsorAuthenticated', 'true');
          localStorage.setItem('sponsorId', user.uid);
          
          if (rememberMe) {
            localStorage.setItem('sponsorRememberedEmail', email);
          } else {
            localStorage.removeItem('sponsorRememberedEmail');
          }

          toast.success('🎉 Welcome back to the Sponsor Portal!');
          navigate('/sponsor/dashboard');
        } else {
          await auth.signOut();
          throw new Error('Not authorized as a sponsor');
        }
      } else {
        if (!name.trim() || !companyName.trim()) {
          toast.error('Please enter your name and company name.');
          setIsLoading(false);
          return;
        }

        const result = await createUserWithEmailAndPassword(auth, email, password);
        const user = result.user;

        const sponsorProfile = {
          name: name,
          companyName: companyName,
          email: email,
          role: 'sponsor',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'sponsors', user.uid), sponsorProfile);

        localStorage.setItem('isSponsorAuthenticated', 'true');
        localStorage.setItem('sponsorId', user.uid);

        toast.success('🎉 Account created! Welcome to the Sponsor Portal!');
        navigate('/sponsor/dashboard');
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
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleProviderLogin = async (authProvider: any, providerName: string) => {
    try {
      setIsLoading(true);
      setLoadingStep(`Connecting to ${providerName}...`);
      const result = await signInWithPopup(auth, authProvider);
      const user = result.user;

      const userRef = doc(db, 'sponsors', user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        // Registering a new sponsor via OAuth
        const sponsorProfile = {
          name: user.displayName || '',
          companyName: 'My Company', // Default, they can update later
          email: user.email || '',
          role: 'sponsor',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await setDoc(userRef, sponsorProfile);
      }

      localStorage.setItem('isSponsorAuthenticated', 'true');
      localStorage.setItem('sponsorId', user.uid);

      toast.success(`🎉 Welcome! ${providerName} login successful!`);
      navigate('/sponsor/dashboard', { replace: true });
    } catch (error: any) {
      console.error(`${providerName} login error:`, error);
      let errorMessage = `${providerName} login failed. Please try again.`;

      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Login cancelled. Please try again.';
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        errorMessage = 'An account already exists with the same email address.';
      }
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
      setLoadingStep('');
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
      toast.error('Failed to send reset email. Please verify the email address.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-pink-400/20 to-indigo-400/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/20">
          <div className="text-center mb-8">
            <div className="flex flex-col items-center mb-4">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4 shadow-sm">
                <Megaphone className="w-8 h-8 text-indigo-600" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                QuickXerox <span className="text-purple-600">Sponsor</span>
              </h2>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mt-2">
              {isLogin ? 'Sign in to your account' : 'Create sponsor account'}
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setPassword('');
                }}
                className="font-medium text-purple-600 hover:text-purple-500 hover:underline transition-colors"
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleEmailPasswordLogin}>
            {!isLogin && (
              <>
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="name" type="text" required value={name} onChange={(e) => setName(e.target.value)}
                      className="pl-12 w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/50 transition-all"
                      placeholder="John Doe" disabled={isLoading}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="companyName" className="block text-sm font-semibold text-gray-700 mb-1">Company / Brand Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Building2 className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="companyName" type="text" required value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                      className="pl-12 w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/50 transition-all"
                      placeholder="Acme Corp" disabled={isLoading}
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1">Email address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="pl-12 w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/50 transition-all"
                  placeholder="sponsor@example.com" disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password" type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="pl-12 w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/50 transition-all"
                  placeholder="••••••••" disabled={isLoading}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 text-gray-500 hover:text-gray-700">
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input id="remember-me" type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="h-4 w-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500" />
                <label htmlFor="remember-me" className="ml-2 text-sm text-gray-700 font-medium">Remember me</label>
              </div>

              {isLogin && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setIsResetPasswordModalOpen(true)}
                    className="text-sm font-medium text-purple-600 hover:text-purple-500"
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </div>

            <button type="submit" disabled={isLoading} className="w-full flex justify-center py-3 px-6 rounded-xl shadow-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 font-semibold transition-all hover:-translate-y-0.5">
              {isLoading ? (loadingStep || 'Processing...') : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500 font-medium rounded-full">
                  Or continue with
                </span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <button
                onClick={() => handleProviderLogin(provider, 'Google')}
                disabled={isLoading}
                type="button"
                className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-200 rounded-xl bg-white text-gray-700 hover:bg-gray-50 font-medium transition-all shadow-sm hover:shadow"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                <span>Sign in with Google</span>
              </button>

              <button
                onClick={() => handleProviderLogin(githubProvider, 'GitHub')}
                disabled={isLoading}
                type="button"
                className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-transparent rounded-xl bg-[#24292e] text-white hover:bg-[#2f363d] font-medium transition-all shadow-sm hover:shadow"
              >
                <Github className="w-5 h-5" />
                <span>Sign in with GitHub</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Password Modal */}
      {isResetPasswordModalOpen && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 lg:p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-bold text-gray-900 mb-2 text-center">
              Reset Password
            </h3>
            <p className="text-gray-500 text-center mb-6 text-sm">Enter your email and we'll send you a link to reset your password.</p>
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <label htmlFor="reset-email" className="block text-sm font-semibold text-gray-700 mb-1">
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="reset-email" type="email" required value={resetEmail} onChange={(e) => setResetEmail(e.target.value)}
                    className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                    placeholder="sponsor@example.com"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button" onClick={() => { setIsResetPasswordModalOpen(false); setResetEmail(''); }}
                  className="px-5 py-2.5 font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={isLoading}
                  className="px-5 py-2.5 font-medium text-white bg-purple-600 rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-60"
                >
                  Send Reset Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SponsorLoginPage;
