import React, { useState, useEffect } from 'react';
import { Mail, Send } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { auth, db } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';

const SellerInvitation = () => {
  const [email, setEmail] = useState('');
  const [shopName, setShopName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          toast.error('Please log in as an admin');
          return;
        }

        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        setIsAdmin(adminDoc.exists());
        
        if (!adminDoc.exists()) {
          toast.error('You do not have admin privileges');
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        toast.error('Error checking admin status');
      }
    };

    checkAdminStatus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAdmin) {
      toast.error('Only admins can send invitations');
      return;
    }

    setIsLoading(true);

    try {
      // Log the current user for debugging
      const user = auth.currentUser;
      console.log('Current user:', user?.uid);
      console.log('Current user email:', user?.email);

      // Create invitation in Firestore
      const invitationRef = await addDoc(collection(db, 'sellerInvitations'), {
        email,
        shopName,
        status: 'pending',
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        createdBy: user?.uid // Add this to track who created the invitation
      });

      console.log('Invitation created with ID:', invitationRef.id);
      toast.success(`Invitation sent to ${email}`);
      
      // Reset form
      setEmail('');
      setShopName('');
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      // More detailed error message
      if (error.code === 'permission-denied') {
        toast.error('Permission denied. Please make sure you are logged in as an admin.');
      } else {
        toast.error(error.message || 'Failed to send invitation');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Access Denied</h2>
        <p className="text-red-600">You need to be logged in as an admin to access this page.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Invite New Seller</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email Address
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 block w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="seller@example.com"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="shopName" className="block text-sm font-medium text-gray-700">
            Shop Name
          </label>
          <input
            type="text"
            id="shopName"
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            className="mt-1 block w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter shop name"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isLoading ? (
            'Sending...'
          ) : (
            <>
              <Send className="h-5 w-5 mr-2" />
              Send Invitation
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default SellerInvitation; 