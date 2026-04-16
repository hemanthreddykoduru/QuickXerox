import React from 'react';
import { User, Phone, MapPin, Mail, Edit3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { UserProfile } from '../../types';

interface AccountDetailsProps {
  profile: UserProfile;
  onEdit: () => void;
}

const AccountDetails: React.FC<AccountDetailsProps> = ({ profile, onEdit }) => {
  const MotionDiv = motion.div as any;

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-xl shadow-blue-500/5 rounded-3xl overflow-hidden"
    >
      <div className="relative h-24 bg-gradient-to-r from-blue-600 to-blue-400">
        <div className="absolute -bottom-12 left-6">
          <div className="w-24 h-24 rounded-2xl bg-white p-1 shadow-lg shadow-blue-900/10">
            <div className="w-full h-full rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100/50">
              <User className="h-10 w-10 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="pt-16 pb-6 px-6 sm:px-8">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
              {profile.name || 'User Profile'}
            </h2>
            <p className="text-sm font-bold text-blue-600 uppercase tracking-widest mt-1">
              Customer Account
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onEdit}
            className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-blue-100/50 shadow-sm"
            title="Edit Profile"
          >
            <Edit3 className="h-5 w-5" />
          </motion.button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-6">
          <div className="flex items-center space-x-4 p-4 rounded-2xl bg-gray-50/50 border border-gray-100/50 hover:bg-white transition-colors group">
            <div className="p-2.5 rounded-xl bg-blue-100/50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
              <Phone className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Mobile</p>
              <p className="font-bold text-gray-900 truncate">{profile.mobile || 'Not provided'}</p>
            </div>
          </div>

          <div className="flex items-center space-x-4 p-4 rounded-2xl bg-gray-50/50 border border-gray-100/50 hover:bg-white transition-colors group">
            <div className="p-2.5 rounded-xl bg-blue-100/50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Email</p>
              <p className="font-bold text-gray-900 truncate">{profile.email || 'Not provided'}</p>
            </div>
          </div>

          <div className="flex items-start space-x-4 p-4 rounded-2xl bg-gray-50/50 border border-gray-100/50 hover:bg-white transition-colors group">
            <div className="p-2.5 rounded-xl bg-blue-100/50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all mt-1">
              <MapPin className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Address</p>
              <div className="font-bold text-gray-900">
                {profile.address || profile.city || profile.state || profile.pincode ? (
                  <>
                    {profile.address && <p className="truncate">{profile.address}</p>}
                    {(profile.city || profile.state || profile.pincode) && (
                      <p className="text-sm font-medium text-gray-500 mt-0.5">
                        {[profile.city, profile.state, profile.pincode].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-gray-400">Not provided</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MotionDiv>
  );
};

export default AccountDetails;