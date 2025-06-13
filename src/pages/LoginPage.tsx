import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Printer, User, ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { toast } from 'react-hot-toast';
import MobileInput from '../components/auth/MobileInput';
import { generateOTP, verifyOTP, updateProfile } from '../services/auth.service';
import { OTP_CONFIG } from '../config/constants';

import { signInWithPopup } from 'firebase/auth';
import { auth, provider, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UserProfile } from '../types/profile';
import { useProfile } from '../hooks/useProfile';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lastLoginAttempt, setLastLoginAttempt] = useState<Date | null>(null);
  const [otpTimer, setOtpTimer] = useState(60);
  const [canResendOtp, setCanResendOtp] = useState(false);

  // Get the return URL from location state or default to customer dashboard
  const from = (location.state as any)?.from?.pathname || '/customerdashboard';

  // Use useProfile hook
  const { refreshProfile } = useProfile();

  useEffect(() => {
    // Check for saved credentials
    const savedMobile = localStorage.getItem('rememberedMobile');
    const savedName = localStorage.getItem('rememberedName');
    if (savedMobile) {
      setMobileNumber(savedMobile);
      setRememberMe(true);
    }
    if (savedName) {
      setName(savedName);
    }
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOtpSent && otpTimer > 0) {
      timer = setInterval(() => {
        setOtpTimer((prev) => {
          if (prev <= 1) {
            setCanResendOtp(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isOtpSent, otpTimer]);

  const handleSendOTP = async () => {
    if (!OTP_CONFIG.MOBILE_REGEX.test(mobileNumber)) {
      toast.error('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    if (!isLogin && !name.trim()) {
      toast.error('Please enter your name.');
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
      const result = await generateOTP(mobileNumber);
      if (result.success) {
        setIsOtpSent(true);
        setOtpTimer(60);
        setCanResendOtp(false);
        setLoginAttempts(prev => prev + 1);
        setLastLoginAttempt(new Date());
        toast.success('OTP sent successfully!');
      } else {
        console.error('OTP generation failed:', result.error);
        toast.error(result.error || 'Failed to send OTP. Please try again.');
      }
    } catch (error) {
      console.error('Error sending OTP:', error);
      toast.error('Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = () => {
    if (canResendOtp) {
      handleSendOTP();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isOtpSent) {
      handleSendOTP();
      return;
    }

    if (otp.trim().length !== OTP_CONFIG.OTP_LENGTH) {
      toast.error('Please enter the 6-digit OTP.');
      return;
    }

    if (otpTimer === 0) {
      toast.error('OTP has expired. Please request a new one.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await verifyOTP(mobileNumber, otp);
      if (result.success) {
        localStorage.setItem('isAuthenticated', 'true');
        
        // Get the current authenticated user
        const firebaseUser = auth.currentUser;
        if (!firebaseUser) {
          toast.error('Authentication failed. Please try again.');
          setIsLoading(false);
          return;
        }

        console.log('Firebase User UID:', firebaseUser.uid);
        console.log('Firebase User Phone Number:', firebaseUser.phoneNumber);
        console.log('Firebase User Email:', firebaseUser.email);
        
        sessionStorage.setItem('userPhone', mobileNumber);
        sessionStorage.removeItem('userEmail'); // Clear email for OTP login
        
        // Only use localStorage for "remember me" functionality
        if (rememberMe) {
          localStorage.setItem('rememberedMobile', mobileNumber);
          if (!isLogin) {
            localStorage.setItem('rememberedName', name);
          }
        } else {
          localStorage.removeItem('rememberedMobile');
          localStorage.removeItem('rememberedName');
        }

        if (!isLogin) {
          console.log('Creating new account...');
          // Create initial profile for new account
          const initialProfile = {
            name: name,
            mobile: mobileNumber,
            email: '',
            address: '',
            city: '',
            state: '',
            pincode: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          try {
            // Create user through server endpoint
            const response = await fetch('/api/users/create', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                uid: firebaseUser.uid, // Pass UID to backend
                ...initialProfile,
                role: 'customer',
                lastLogin: new Date().toISOString(),
                isActive: true
              }),
            });

            if (!response.ok) {
              throw new Error('Failed to create user account');
            }

            const data = await response.json();
            
            if (data.success) {
              // Store in sessionStorage (tab-specific)
              sessionStorage.setItem('userProfile', JSON.stringify(initialProfile));
              sessionStorage.setItem('userName', name);
              sessionStorage.setItem('userPhone', mobileNumber);

              // Refresh profile data using UID
              await refreshProfile(firebaseUser.uid); // Pass UID to refreshProfile
              console.log('Profile refreshed after new account creation.');

              toast.success('Account created successfully!');
              setIsLoading(false); // Ensure isLoading is false before navigation
              // Add a small delay before navigation
              setTimeout(() => {
                console.log('Navigating to /customerdashboard after new account creation.');
                navigate('/customerdashboard', { replace: true });
              }, 100);
            } else {
              throw new Error(data.error || 'Failed to create account');
            }
          } catch (error) {
            console.error('Error creating user account:', error);
            toast.error('Failed to create account. Please try again.');
            setIsLoading(false); // Ensure isLoading is false on error
            return;
          }
        } else {
          // For existing users, fetch and load their profile data
          try {
            console.log('Fetching existing user profile...');
            const response = await fetch(`/api/users/${firebaseUser.uid}`); // Use UID to fetch
            
            if (!response.ok) {
              throw new Error('Failed to fetch user profile');
            }

            const data = await response.json();
            
            if (data.success) {
              const userProfile = data.profile;

              // Store in sessionStorage (tab-specific)
              sessionStorage.setItem('userProfile', JSON.stringify(userProfile));
              sessionStorage.setItem('userName', userProfile.name);
              sessionStorage.setItem('userPhone', userProfile.mobile);
              sessionStorage.setItem('userEmail', userProfile.email || ''); // Ensure email is set or cleared

              // Update last login time
              await fetch(`/api/users/${firebaseUser.uid}/login`, { // Use UID to update last login
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                lastLogin: new Date().toISOString()
                }),
              });
              console.log('Last login time updated.');

              // Refresh profile data using UID
              await refreshProfile(firebaseUser.uid); // Pass UID to refreshProfile
              console.log('Profile refreshed after existing user login.');

              toast.success('Login successful!');
              setIsLoading(false); // Ensure isLoading is false before navigation
              // Add a small delay before navigation
              setTimeout(() => {
                console.log('Navigating to /customerdashboard after existing user login.');
                navigate('/customerdashboard', { replace: true });
              }, 100);
            } else {
              console.error('User profile not found');
              toast.error('User profile not found. Please try again.');
              setIsLoading(false); // Ensure isLoading is false on error
            }
          } catch (error) {
            console.error('Error handling user profile:', error);
            toast.error('Failed to load user profile. Please try again.');
            setIsLoading(false); // Ensure isLoading is false on error
          }
        }
      } else {
        toast.error(result.error || 'Invalid OTP. Please try again.');
        setIsLoading(false); // Ensure isLoading is false on OTP verification failure
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      toast.error('Failed to verify OTP. Please try again.');
      setIsLoading(false); // Ensure isLoading is false on general error
    } finally {
      // This finally block might not be strictly necessary if isLoading is handled in every path,
      // but it serves as a fail-safe.
      if (isLoading) {
      setIsLoading(false);
      }
      console.log('handleSubmit finally block executed. Final isLoading state:', isLoading);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // First, check if user already exists in Firestore
      const userId = user.uid;
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      let initialProfile: UserProfile;
      
      if (userDoc.exists()) {
        // If user exists, use their existing profile data
        console.log('Existing user found, loading profile...');
        const existingData = userDoc.data();
        initialProfile = {
          name: user.displayName || existingData.name || '',
          mobile: existingData.mobile || '', // Keep existing mobile if any
          email: user.email || '',
          address: existingData.address || '',
          city: existingData.city || '',
          state: existingData.state || '',
          pincode: existingData.pincode || '',
          createdAt: existingData.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      } else {
        // Create new profile for first-time user
        console.log('Creating new user profile...');
        initialProfile = {
          name: user.displayName || '',
          mobile: '', // Mobile number not used for Google login
          email: user.email || '',
          address: '',
          city: '',
          state: '',
          pincode: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }

      // Store authentication state in localStorage
      localStorage.setItem('isAuthenticated', 'true');
      sessionStorage.setItem('userName', initialProfile.name);
      sessionStorage.setItem('userEmail', initialProfile.email);
      sessionStorage.setItem('userProfile', JSON.stringify(initialProfile));

      // Store user data in Firebase
      try {
        console.log('Storing user data in Firebase...');
        
        // Update both user and profile documents
        await Promise.all([
          setDoc(userRef, {
            ...initialProfile,
            role: 'customer',
            lastLogin: new Date().toISOString(),
            isActive: true
          }, { merge: true }),
          setDoc(doc(db, 'profiles', userId), initialProfile, { merge: true })
        ]);

        console.log('User documents updated successfully');
        
        // Update profile on server
        try {
          await updateProfile(initialProfile);
          console.log('Profile updated on server successfully');
        } catch (error) {
          console.error('Error updating profile on server:', error);
          // Continue with login even if profile update fails
        }

        // Refresh profile data
        await refreshProfile();
        console.log('Profile refreshed successfully');

        toast.success('Login successful!');
        setIsLoading(false); // Ensure isLoading is false before navigation
        
        // Add a small delay before navigation to ensure all state updates are complete
        setTimeout(() => {
          console.log('Attempting to navigate to: /customerdashboard');
          navigate('/customerdashboard', { replace: true });
        }, 100);
      } catch (error: any) {
        console.error('Error storing user data in Firebase:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        if (error.code === 'permission-denied') {
          toast.error('Permission denied. Please check Firebase rules.');
        } else if (error.code === 'unavailable') {
          toast.error('Firebase service is currently unavailable. Please try again later.');
        } else {
          toast.error('Failed to store data in Firebase. Please try logging in again.');
        }
        setIsLoading(false); // Ensure isLoading is false on error
        return;
      }
    } catch (error: any) {
      console.error('Google login error:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        toast.error('Login cancelled. Please try again.');
      } else if (error.code === 'auth/popup-blocked') {
        toast.error('Popup was blocked. Please allow popups for this site.');
      } else {
        toast.error('Google login failed. Please try again.');
      }
      setIsLoading(false); // Ensure isLoading is false on general error
    } finally {
      // This finally block might not be strictly necessary if isLoading is handled in every path,
      // but it serves as a fail-safe.
      if (isLoading) {
      setIsLoading(false);
      }
      console.log('handleGoogleLogin finally block executed. Final isLoading state:', isLoading);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full md:max-w-md">
        <div className="flex justify-center">
          <Printer className="h-12 w-12 text-blue-600" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          QuickXerox
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {isLogin ? 'Welcome back!' : 'Create your account'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full md:max-w-md">
        <div className="bg-white py-6 px-4 shadow sm:rounded-lg sm:px-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {!isLogin && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10 block w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="John Doe"
                  />
                </div>
              </div>
            )}

            <MobileInput
              value={mobileNumber}
              onChange={setMobileNumber}
              disabled={isOtpSent}
            />

            {isOtpSent && (
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                  OTP
                </label>
                <div className="mt-1 relative">
                  <input
                    id="otp"
                    type={showPassword ? "text" : "password"}
                    maxLength={OTP_CONFIG.OTP_LENGTH}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter 6-digit OTP"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    {otpTimer > 0 ? `OTP expires in ${otpTimer}s` : 'OTP expired'}
                  </p>
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={!canResendOtp}
                    className="text-sm font-medium text-blue-600 hover:text-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Resend OTP
                  </button>
                </div>
              </div>
            )}

            {isLogin && (
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  Remember me
                </label>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                  <ArrowRight className="h-5 w-5 text-blue-500 group-hover:text-blue-400" />
                </span>
                {isLoading ? 'Processing...' : isOtpSent ? 'Verify OTP' : 'Send OTP'}
              </button>
            </div>
          </form>

          <div className="mt-4">
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              type="button"
              className="w-full flex items-center justify-center gap-2 py-2 px-4 border rounded-md bg-white text-gray-700 hover:bg-gray-100 shadow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google"
                className="w-5 h-5"
              />
              Continue with Google
            </button>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  {isLogin ? 'New to QuickXerox?' : 'Already have an account?'}
                </span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setIsOtpSent(false);
                  setOtp('');
                }}
                disabled={isLoading}
                type="button"
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLogin ? 'Create new account' : 'Login with existing account'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
