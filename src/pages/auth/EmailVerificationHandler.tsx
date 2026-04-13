import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { applyActionCode } from 'firebase/auth';
import { auth } from '../../firebase';
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';

const EmailVerificationHandler = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const verifyAttempted = useRef(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const oobCode = searchParams.get('code');

    if (!oobCode) {
      setStatus('error');
      setErrorMessage('Verification code is missing from the URL. Please click the link in your email again.');
      return;
    }

    if (verifyAttempted.current) return;
    verifyAttempted.current = true;

    const verifyEmail = async () => {
      try {
        await applyActionCode(auth, oobCode);
        setStatus('success');
      } catch (error: any) {
        setStatus('error');
        if (error.code === 'auth/invalid-action-code') {
          setErrorMessage('This verification link is invalid or has already been used.');
        } else if (error.code === 'auth/expired-action-code') {
          setErrorMessage('This verification link has expired. Please log in to request a new one.');
        } else {
          setErrorMessage('An error occurred during verification. Please try again later.');
        }
      }
    };

    verifyEmail();
  }, [location]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
            <img 
              src="https://tkwazltvxdztaunerksd.supabase.co/storage/v1/object/public/assets/Background-Removed.png" 
              alt="QuickXerox" 
              className="h-10 w-auto"
            />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Email Verification
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100">
          <div className="flex flex-col items-center justify-center space-y-6 text-center">
            
            {status === 'loading' && (
              <>
                <Loader2 className="h-16 w-16 text-blue-600 animate-spin" />
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Verifying your email</h3>
                  <p className="mt-2 text-sm text-gray-500">Please wait while we confirm your email address...</p>
                </div>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-medium text-gray-900">Email Verified!</h3>
                  <p className="mt-2 text-sm text-gray-500">Your email address has been successfully verified. You can now access all features of QuickXerox.</p>
                </div>
                <button
                  onClick={() => navigate('/login')}
                  className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors mt-4"
                >
                  Continue to Login
                  <ArrowRight className="ml-2 h-4 w-4" />
                </button>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center">
                  <XCircle className="h-10 w-10 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xl font-medium text-gray-900">Verification Failed</h3>
                  <p className="mt-2 text-sm text-gray-500">{errorMessage}</p>
                </div>
                <button
                  onClick={() => navigate('/login')}
                  className="w-full flex justify-center items-center py-2.5 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors mt-4"
                >
                  Return to Login
                </button>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationHandler;
