import React from 'react';
import Modal from '../common/Modal';
import EditProfileForm from './EditProfileForm';
import { UserProfile } from '../../types';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onSave: (updatedProfile: UserProfile) => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSave,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Profile"
    >
      <EditProfileForm
        profile={profile}
        onSave={onSave}
        onCancel={onClose}
      />
    </Modal>
  );
};

export default EditProfileModal;
