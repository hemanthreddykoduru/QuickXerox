import { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { validatePhoneNumber, validateEmail } from '../utils/validation';

const DEFAULT_PROFILE: UserProfile = {
  name: 'John Doe',
  mobile: '+91 99999 99999',
  email: 'john@example.com',
  address: '123 Main St, New York, NY 10001'
};

export const useProfile = () => {
  const [profile, setProfile] = useState<UserProfile>(() => {
    const savedProfile = localStorage.getItem('userProfile');
    return savedProfile ? JSON.parse(savedProfile) : DEFAULT_PROFILE;
  });

  useEffect(() => {
    localStorage.setItem('userProfile', JSON.stringify(profile));
  }, [profile]);

  const updateProfile = (updatedProfile: UserProfile) => {
    if (!validatePhoneNumber(updatedProfile.mobile)) {
      throw new Error('Invalid phone number format');
    }
    if (!validateEmail(updatedProfile.email)) {
      throw new Error('Invalid email format');
    }
    setProfile(updatedProfile);
  };

  return { profile, updateProfile };
};