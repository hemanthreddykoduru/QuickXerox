import React, { useState, useEffect } from 'react';
import { useProfile } from '../../hooks/useProfile';
import FormInput from '../common/FormInput';
import { toast } from 'react-hot-toast';
import { UserProfile } from '../../types';

interface EditProfileFormProps {
  onClose: () => void;
}

const EditProfileForm: React.FC<EditProfileFormProps> = ({ onClose }) => {
  const { profile, updateProfile, refreshProfile } = useProfile();
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    name: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    mobile: '',
  });

  // Update form data when profile changes
  useEffect(() => {
    console.log('Profile updated in EditProfileForm:', profile);
    setFormData({
      name: profile.name || '',
      email: profile.email || '',
      address: profile.address || '',
      city: profile.city || '',
      state: profile.state || '',
      pincode: profile.pincode || '',
      mobile: profile.mobile || '',
    });
  }, [profile]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name?.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    if (formData.pincode && !/^\d{6}$/.test(formData.pincode)) {
      newErrors.pincode = 'Pincode must be 6 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const updatedProfile = {
        ...formData,
        mobile: profile.mobile || '',
        createdAt: profile.createdAt,
      } as UserProfile;

      console.log('Submitting profile update:', updatedProfile);
      await updateProfile(updatedProfile);
      
      // Refresh the profile data to ensure we have the latest
      await refreshProfile();
      
      onClose(); // Close the modal after successful update
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2">
        <FormInput
          label="Name"
          type="text"
          name="name"
          value={formData.name || ''}
          onChange={handleChange}
          required
          error={errors.name}
          maxLength={50}
        />
        <FormInput
          label="Email"
          type="email"
          name="email"
          value={formData.email || ''}
          onChange={handleChange}
          error={errors.email}
          maxLength={100}
        />
        <FormInput
          label="Address"
          type="text"
          name="address"
          value={formData.address || ''}
          onChange={handleChange}
          maxLength={200}
        />
        <FormInput
          label="City"
          type="text"
          name="city"
          value={formData.city || ''}
          onChange={handleChange}
          maxLength={50}
        />
        <FormInput
          label="State"
          type="text"
          name="state"
          value={formData.state || ''}
          onChange={handleChange}
          maxLength={50}
        />
        <FormInput
          label="Pincode"
          type="text"
          name="pincode"
          value={formData.pincode || ''}
          onChange={handleChange}
          error={errors.pincode}
          maxLength={6}
        />
      </div>

      <div className="mt-4 flex justify-end space-x-2 sm:mt-6 sm:space-x-3">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Save Changes
        </button>
      </div>
    </form>
  );
};

export default EditProfileForm;
