import { OTP_CONFIG } from '../config/constants';
import { UserProfile } from '../types';
import { auth } from '../firebase';
import { signInWithCustomToken } from 'firebase/auth';

// Use relative URL for API calls (will be handled by Vite proxy)
const API_URL = '/api';

const parseResponse = async (response: Response) => {
  try {
    const text = await response.text();
    console.log('Raw server response:', text); // Debug log

    if (!text) {
      throw new Error('Empty response from server');
}

    try {
      const data = JSON.parse(text);
      console.log('Parsed response data:', data); // Debug log
      return data;
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      throw new Error('Invalid JSON response from server');
    }
  } catch (error) {
    console.error('Response parsing error:', error);
    throw error;
  }
};

const makeRequest = async (endpoint: string, options: RequestInit) => {
  try {
    console.log(`Making request to ${endpoint}:`, options); // Debug log
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    console.log('Response status:', response.status); // Debug log
    return response;
  } catch (error) {
    console.error('Request error:', error);
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. Please check your internet connection.');
      }
    }
    throw error;
  }
};

const checkServerHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add timeout to prevent long waits
      signal: AbortSignal.timeout(5000)
    });
  
    if (!response.ok) {
      throw new Error('Server health check failed');
    }
    
    const data = await parseResponse(response);
    return data.status === 'ok';
  } catch (error) {
    console.error('Server health check failed:', error);
    return false;
  }
};

const cleanMobileNumber = (mobile: string): string => {
  // Remove any non-digit characters and the +91 prefix if present
  return mobile.replace(/[^0-9]/g, '');
};

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const fetchWithRetry = async (url: string, options?: RequestInit, retries = MAX_RETRIES): Promise<Response> => {
  try {
    const response = await fetch(url, options);
    if (!response.ok && retries > 0) {
      await sleep(RETRY_DELAY);
      return fetchWithRetry(url, options, retries - 1);
    }
    return response;
  } catch (error) {
    if (retries > 0) {
      await sleep(RETRY_DELAY);
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
};

export const generateOTP = async (mobileNumber: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // Validate mobile number format
    if (!OTP_CONFIG.MOBILE_REGEX.test(mobileNumber)) {
      return { 
        success: false, 
        error: 'Please enter a valid 10-digit mobile number' 
      };
    }

    const response = await makeRequest('/send-otp', {
      method: 'POST',
      body: JSON.stringify({ mobileNumber })
    });

    const data = await parseResponse(response);
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to send OTP');
    }

    return { success: data.success };
  } catch (error) {
    console.error('Error generating OTP:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { 
      success: false, 
      error: 'Failed to send OTP. Please check your internet connection.' 
    };
  }
};

export const verifyOTP = async (mobileNumber: string, userOTP: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // Validate OTP format
    if (!/^\d{6}$/.test(userOTP)) {
      return { 
        success: false, 
        error: 'Please enter a valid 6-digit OTP' 
      };
    }

    const response = await makeRequest('/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ mobileNumber, otp: userOTP })
    });

    const data = await parseResponse(response);
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to verify OTP');
    }

    // If backend verification is successful, sign in with Firebase Auth
    try {
      if (!data.customToken) {
        throw new Error('Custom token not received from server.');
      }
      await signInWithCustomToken(auth, data.customToken);
      console.log('Firebase phone authentication successful.');
    } catch (firebaseAuthError) {
      console.error('Firebase phone authentication failed:', firebaseAuthError);
      return { success: false, error: 'Firebase authentication failed.' };
    }

    return { success: data.success };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { 
      success: false, 
      error: 'Failed to verify OTP. Please check your internet connection.' 
    };
  }
};

export const updateProfile = async (profile: UserProfile): Promise<UserProfile> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('No authenticated user found.');
    }

    const cleanMobile = profile.mobile ? cleanMobileNumber(profile.mobile) : '';
    const profileToUpdate = {
      uid: currentUser.uid, // Add UID to the payload
      ...profile,
      mobile: cleanMobile
    };

    console.log('Updating profile:', profileToUpdate);

    const response = await fetchWithRetry('/api/profile/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profileToUpdate),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update profile');
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to update profile');
    }

    // Update local storage with new profile data
    localStorage.setItem('userProfile', JSON.stringify(data.profile));
    
    return data.profile;
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
};

export const getProfile = async (mobile: string): Promise<UserProfile> => {
  try {
    const cleanMobile = cleanMobileNumber(mobile);
    console.log('Fetching profile for mobile:', cleanMobile);

    const response = await fetchWithRetry(`/api/profile/${cleanMobile}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch profile');
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch profile');
    }

    return data.profile;
  } catch (error) {
    console.error('Error fetching profile:', error);
    throw error;
  }
};