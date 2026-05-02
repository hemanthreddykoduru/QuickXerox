import React, { useState, useEffect } from 'react';
import FormInput from '../common/FormInput';
import { UserProfile } from '../../types';

interface EditProfileFormProps {
  onClose: () => void;
  profile: UserProfile;
  onSave: (data: UserProfile) => Promise<void> | void;
}

const EditProfileForm: React.FC<EditProfileFormProps> = ({ onClose, profile, onSave }) => {
  // Removed internal useProfile to avoid state desync

  const [formData, setFormData] = useState<Partial<UserProfile>>({
    name: profile?.name || '',
    email: profile?.email || '',
    address: profile?.address || '',
    city: profile?.city || '',
    state: profile?.state || '',
    pincode: profile?.pincode || '',
    mobile: profile?.mobile || '',
  });

  // Update form data when profile prop changes
  useEffect(() => {
    setFormData({
      name: profile?.name || '',
      email: profile?.email || '',
      address: profile?.address || '',
      city: profile?.city || '',
      state: profile?.state || '',
      pincode: profile?.pincode || '',
      mobile: profile?.mobile || '',
    });
  }, [profile]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.mobile || !/^\d{10}$/.test(formData.mobile)) {
      newErrors.mobile = 'Mobile number must be 10 digits';
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
        ...profile, // Merge with existing profile
        ...formData,
        mobile: formData.mobile || profile.mobile || '',
        createdAt: profile.createdAt,
        updatedAt: new Date().toISOString()
      } as UserProfile;


      // Call parent handler (AccountPage) to execute update and refresh local state
      await onSave(updatedProfile);

      onClose(); // Close the modal after successful update
    } catch (error) {
      console.error('Error updating profile:', error);
      // toast handled by parent or hook
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const nextValue = name === 'mobile' ? value.replace(/[^0-9]/g, '').slice(0, 10) : value;
    setFormData(prev => ({
      ...prev,
      [name]: nextValue
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
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-1 gap-3.5 sm:gap-6 sm:grid-cols-2">
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
          label="Mobile Number"
          type="tel"
          name="mobile"
          value={formData.mobile || ''}
          onChange={handleChange}
          required
          error={errors.mobile}
          maxLength={10}
          placeholder="10-digit number"
        />
        <FormInput
          label="Email (Cannot be changed)"
          type="email"
          name="email"
          value={formData.email || ''}
          onChange={handleChange}
          error={errors.email}
          maxLength={100}
          disabled={true}
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

      <div className="mt-6 sm:mt-8 flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-3">
        <button
          type="button"
          onClick={onClose}
          className="w-full sm:w-auto px-6 py-2.5 sm:py-2 text-sm font-bold text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="w-full sm:w-auto px-6 py-2.5 sm:py-2 text-sm font-bold text-white bg-indigo-600 border border-transparent rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-all"
        >
          Save Changes
        </button>
      </div>
    </form>
  );
};

export default EditProfileForm;
