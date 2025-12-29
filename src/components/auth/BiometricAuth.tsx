import React, { useState, useEffect } from 'react';
import { Fingerprint, Smartphone, Shield } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface BiometricAuthProps {
  onSuccess: (credential: any) => void;
  onError: (error: any) => void;
  isEnabled?: boolean;
}

const BiometricAuth: React.FC<BiometricAuthProps> = ({ onSuccess, onError, isEnabled = true }) => {
  const [isSupported, setIsSupported] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkBiometricSupport();
  }, []);

  const checkBiometricSupport = async () => {
    try {
      // Check if WebAuthn is supported
      if (window.PublicKeyCredential) {
        setIsSupported(true);
        
        // Check if platform authenticator is available
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        setIsAvailable(available);
      }
    } catch (error) {
      console.error('Biometric support check failed:', error);
    }
  };

  const handleBiometricLogin = async () => {
    if (!isSupported || !isAvailable) {
      toast.error('Biometric authentication is not supported on this device');
      return;
    }

    setIsLoading(true);
    try {
      // Get existing credentials
      const credentials = await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(32),
          allowCredentials: [],
          userVerification: 'required',
        }
      });

      if (credentials) {
        onSuccess(credentials);
        toast.success('Biometric authentication successful!');
      }
    } catch (error: any) {
      console.error('Biometric authentication failed:', error);
      onError(error);
      
      if (error.name === 'NotAllowedError') {
        toast.error('Biometric authentication was cancelled or not allowed');
      } else if (error.name === 'NotSupportedError') {
        toast.error('Biometric authentication is not supported');
      } else {
        toast.error('Biometric authentication failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const registerBiometric = async () => {
    if (!isSupported) {
      toast.error('Biometric authentication is not supported on this device');
      return;
    }

    setIsLoading(true);
    try {
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: new Uint8Array(32),
          rp: {
            name: 'QuickXerox',
            id: window.location.hostname,
          },
          user: {
            id: new Uint8Array(16),
            name: 'user@quickxerox.com',
            displayName: 'QuickXerox User',
          },
          pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
          timeout: 60000,
          attestation: 'direct',
        },
      });

      if (credential) {
        toast.success('Biometric authentication registered successfully!');
        // Store credential ID for future use
        localStorage.setItem('biometricCredentialId', credential.id);
      }
    } catch (error: any) {
      console.error('Biometric registration failed:', error);
      onError(error);
      toast.error('Failed to register biometric authentication');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isEnabled) return null;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="flex justify-center mb-2">
          {isSupported && isAvailable ? (
            <Shield className="h-8 w-8 text-green-600" />
          ) : (
            <Smartphone className="h-8 w-8 text-gray-400" />
          )}
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Biometric Authentication</h3>
        <p className="text-sm text-gray-600">
          {isSupported && isAvailable 
            ? 'Use your fingerprint or face to sign in quickly and securely'
            : 'Biometric authentication is not available on this device'
          }
        </p>
      </div>

      {isSupported && isAvailable && (
        <div className="space-y-3">
          <button
            onClick={handleBiometricLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Fingerprint className="h-5 w-5" />
            {isLoading ? 'Authenticating...' : 'Sign in with Biometrics'}
          </button>
          
          {!localStorage.getItem('biometricCredentialId') && (
            <button
              onClick={registerBiometric}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Shield className="h-4 w-4" />
              Set up Biometric Authentication
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default BiometricAuth;
