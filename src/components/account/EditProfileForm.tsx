import React, { useState, useEffect } from 'react';
import FormInput from '../common/FormInput';
import { UserProfile } from '../../types';
import { motion } from 'framer-motion';
import { Save, X } from 'lucide-react';

interface EditProfileFormProps {
  onClose: () => void;
  profile: UserProfile;
  onSave: (data: UserProfile) => Promise<void> | void;
}

const EditProfileForm: React.FC<EditProfileFormProps> = ({ onClose, profile, onSave }) => {
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    name: profile?.name || '',
    email: profile?.email || '',
    address: profile?.address || '',
    city: profile?.city || '',
    state: profile?.state || '',
    pincode: profile?.pincode || '',
    mobile: profile?.mobile || '',
  });

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

  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const updatedProfile = {
        ...profile,
        ...formData,
        mobile: formData.mobile || profile.mobile || '',
        updatedAt: new Date().toISOString()
      } as UserProfile;

      await onSave(updatedProfile);
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const nextValue = name === 'mobile' ? value.replace(/[^0-9]/g, '').slice(0, 10) : value;
    setFormData(prev => ({
      ...prev,
      [name]: nextValue
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="bg-gray-50/50 rounded-3xl p-6 border border-gray-100/50">
        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Personal Information</h4>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <FormInput
            label="Full Name"
            type="text"
            name="name"
            placeholder="John Doe"
            value={formData.name || ''}
            onChange={handleChange}
            required
            error={errors.name}
            className="rounded-2xl border-gray-100 focus:border-blue-500 focus:ring-blue-500 transition-all font-medium"
          />
          <FormInput
            label="Mobile Number"
            type="tel"
            name="mobile"
            placeholder="10-digit number"
            value={formData.mobile || ''}
            onChange={handleChange}
            required
            error={errors.mobile}
            className="rounded-2xl border-gray-100 focus:border-blue-500 focus:ring-blue-500 transition-all font-bold"
          />
        </div>
      </div>

      <div className="bg-gray-50/50 rounded-3xl p-6 border border-gray-100/50">
        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Address Details</h4>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FormInput
              label="Street Address"
              type="text"
              name="address"
              placeholder="House No, Street, Landmark"
              value={formData.address || ''}
              onChange={handleChange}
              className="rounded-2xl border-gray-100 focus:border-blue-500 focus:ring-blue-500 transition-all font-medium"
            />
          </div>
          <FormInput
            label="City"
            type="text"
            name="city"
            value={formData.city || ''}
            onChange={handleChange}
            className="rounded-2xl border-gray-100 focus:border-blue-500 focus:ring-blue-500 transition-all font-medium"
          />
          <FormInput
            label="Pincode"
            type="text"
            name="pincode"
            value={formData.pincode || ''}
            onChange={handleChange}
            error={errors.pincode}
            className="rounded-2xl border-gray-100 focus:border-blue-500 focus:ring-blue-500 transition-all font-bold"
          />
        </div>
      </div>

      <div className="flex items-center justify-end space-x-4 pt-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={onClose}
          className="px-6 py-3 text-sm font-black uppercase tracking-widest text-gray-500 hover:text-gray-900 transition-all"
        >
          Discard
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          className="flex items-center space-x-2 px-8 py-3 bg-blue-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all"
        >
          <Save className="h-4 w-4" />
          <span>Save Profile</span>
        </motion.button>
      </div>
    </form>
  );
};

export default EditProfileForm;

export default EditProfileForm;
