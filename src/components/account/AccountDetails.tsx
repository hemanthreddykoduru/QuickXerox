import React from 'react';
import { User, Phone, MapPin, Mail } from 'lucide-react';

interface UserProfile {
  name: string;
  mobile: string;
  email: string;
  address: string;
}

interface AccountDetailsProps {
  profile: UserProfile;
  onEdit: () => void;
}

const AccountDetails: React.FC<AccountDetailsProps> = ({ profile, onEdit }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Account Details</h2>
        <button
          onClick={onEdit}
          className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Edit Profile
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <User className="h-5 w-5 text-gray-400" />
          <div>
            <p className="text-sm text-gray-500">Name</p>
            <p className="font-medium text-gray-900">{profile.name}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Phone className="h-5 w-5 text-gray-400" />
          <div>
            <p className="text-sm text-gray-500">Mobile</p>
            <p className="font-medium text-gray-900">{profile.mobile}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Mail className="h-5 w-5 text-gray-400" />
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-medium text-gray-900">{profile.email}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <MapPin className="h-5 w-5 text-gray-400" />
          <div>
            <p className="text-sm text-gray-500">Address</p>
            <p className="font-medium text-gray-900">{profile.address}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountDetails;