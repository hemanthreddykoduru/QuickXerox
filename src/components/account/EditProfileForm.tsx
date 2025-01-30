import React, { useState } from 'react';
import { User, Phone, Mail, MapPin } from 'lucide-react';
import FormInput from '../common/FormInput';
import { UserProfile } from '../../types';

interface EditProfileFormProps {
  profile: UserProfile;
  onSave: (profile: UserProfile) => void;
  onCancel: () => void;
}

const EditProfileForm: React.FC<EditProfileFormProps> = ({
  profile,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState(profile);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const updateField = (field: keyof UserProfile) => (value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormInput
        label="Full Name"
        value={formData.name}
        onChange={updateField('name')}
        icon={User}
        required
      />

      <FormInput
        label="Mobile Number"
        type="tel"
        value={formData.mobile}
        onChange={updateField('mobile')}
        icon={Phone}
        required
        placeholder="+91 99999 99999"
      />

      <FormInput
        label="Email Address"
        type="email"
        value={formData.email}
        onChange={updateField('email')}
        icon={Mail}
        required
      />

      <FormInput
        label="Address"
        value={formData.address}
        onChange={updateField('address')}
        icon={MapPin}
        required
        isTextArea
        rows={3}
      />

      <div className="flex justify-end space-x-3 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Save Changes
        </button>
      </div>
    </form>
  );
};

export default EditProfileForm;
