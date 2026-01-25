import React, { useState } from 'react';
import EditProfileModal from './EditProfileModal';
import { UserProfile } from '../../types';

const Account: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const userProfile: UserProfile = {
    name: 'Hemanth Reddy',
    mobile: '+91 9999999999',
    email: 'quickprint@example.com',
    address: 'Gitam University, Bengaluru',
  };

  const handleSave = (updatedProfile: UserProfile) => {
    console.log('Updated Profile:', updatedProfile);
    setIsModalOpen(false);
  };

  return (
    <div className="account-page">
      <button
        onClick={() => setIsModalOpen(true)}
        className="edit-profile-button"
      >
        Edit Profile
      </button>

      <EditProfileModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        profile={userProfile}
        onSave={handleSave}
      />
    </div>
  );
};

export default Account;
