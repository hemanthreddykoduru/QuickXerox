import React, { useState, useEffect } from 'react';
import { Mail, Send, Upload, Download, FileSpreadsheet, Loader } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { auth, db } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import emailjs from '@emailjs/browser';

const SellerInvitation = () => {
  const [email, setEmail] = useState('');
  const [shopName, setShopName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [uploadMode, setUploadMode] = useState<'single' | 'bulk'>('single');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    // Initialize EmailJS with public key
    emailjs.init('t3r_n1ddwEfNTp46q');

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
      const user = auth.currentUser;

      // Create invitation in Firestore
      const invitationRef = await addDoc(collection(db, 'sellerInvitations'), {
        email,
        shopName,
        status: 'pending',
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdBy: user?.uid
      });

      // Send email via EmailJS
      const templateParams = {
        to_email: email,
        to_name: shopName,
        shop_name: shopName,
        invitation_link: `https://otp-project-aafc6.web.app/seller-invitation?id=${invitationRef.id}`,
        from_name: 'QuickXerox Admin'
      };

      try {
        await emailjs.send(
          'service_ogdlx38',
          'template_0pb9q2y',
          templateParams
        );

        toast.success(`Invitation sent to ${email}!`);
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        toast.error(`Invitation created but email failed to send. Please contact ${email} manually.`);
      }

      // Reset form
      setEmail('');
      setShopName('');
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      if (error.code === 'permission-denied') {
        toast.error('Permission denied. Please make sure you are logged in as an admin.');
      } else {
        toast.error(error.message || 'Failed to send invitation');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Download CSV Template
  const downloadTemplate = () => {
    const csvContent = 'Email,Shop Name\nseller1@example.com,ABC Print Shop\nseller2@example.com,XYZ Stationery';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'seller_invitation_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success('Template downloaded!');
  };

  // Parse CSV File
  const parseCSV = (text: string): Array<{ email: string; shopName: string }> => {
    const lines = text.trim().split('\n');
    const sellers: Array<{ email: string; shopName: string }> = [];

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(',').map(v => v.trim());
      if (values.length >= 2 && values[0] && values[1]) {
        sellers.push({
          email: values[0],
          shopName: values[1]
        });
      }
    }

    return sellers;
  };

  // Handle CSV File Selection
  const handleCSVFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      if (!file.name.endsWith('.csv')) {
        toast.error('Please upload a CSV file');
        return;
      }

      setCsvFile(file);
      toast.success('File selected: ' + file.name);
    }
  };

  // Process Bulk Upload
  const handleBulkUpload = async () => {
    if (!csvFile) {
      toast.error('Please select a CSV file first');
      return;
    }

    setUploading(true);

    try {
      const text = await csvFile.text();
      const sellers = parseCSV(text);

      if (sellers.length === 0) {
        toast.error('No valid seller data found in CSV');
        setUploading(false);
        return;
      }

      const user = auth.currentUser;
      let successCount = 0;
      let failCount = 0;

      // Process each seller
      for (const seller of sellers) {
        try {
          const invitationRef = await addDoc(collection(db, 'sellerInvitations'), {
            email: seller.email,
            shopName: seller.shopName,
            status: 'pending',
            createdAt: serverTimestamp(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            createdBy: user?.uid
          });

          const templateParams = {
            to_email: seller.email,
            to_name: seller.shopName,
            shop_name: seller.shopName,
            invitation_link: `https://otp-project-aafc6.web.app/seller-invitation?id=${invitationRef.id}`,
            from_name: 'QuickXerox Admin'
          };

          try {
            await emailjs.send(
              'service_ogdlx38',
              'template_0pb9q2y',
              templateParams
            );
            successCount++;
          } catch (emailError) {
            console.error(`Email failed for ${seller.email}:`, emailError);
            failCount++;
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
          console.error(`Failed to invite ${seller.email}:`, error);
          failCount++;
        }
      }

      toast.success(`Successfully sent ${successCount} invitations!`);
      if (failCount > 0) {
        toast.error(`Failed to send ${failCount} invitations`);
      }

      // Reset
      setCsvFile(null);
      const fileInput = document.getElementById('csvFileInput') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error: any) {
      console.error('Error processing CSV:', error);
      toast.error('Failed to process CSV file');
    } finally {
      setUploading(false);
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
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Invite Sellers</h2>

      {/* Mode Toggle */}
      <div className="flex space-x-4 mb-6 border-b">
        <button
          onClick={() => setUploadMode('single')}
          className={`pb-2 px-4 font-medium transition-colors ${uploadMode === 'single'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          <Mail className="h-5 w-5 inline-block mr-2" />
          Single Invitation
        </button>
        <button
          onClick={() => setUploadMode('bulk')}
          className={`pb-2 px-4 font-medium transition-colors ${uploadMode === 'bulk'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          <FileSpreadsheet className="h-5 w-5 inline-block mr-2" />
          Bulk Upload (CSV)
        </button>
      </div>

      {/* Single Invitation Form */}
      {uploadMode === 'single' && (
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
      )}

      {/* Bulk CSV Upload */}
      {uploadMode === 'bulk' && (
        <div className="space-y-6">
          {/* Download Template Button */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">Step 1: Download CSV Template</h3>
            <p className="text-sm text-blue-700 mb-3">
              Download the template file to see the required format
            </p>
            <button
              onClick={downloadTemplate}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Download className="h-5 w-5 mr-2" />
              Download CSV Template
            </button>
          </div>

          {/* Upload CSV */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2">Step 2: Upload Your CSV File</h3>
            <p className="text-sm text-gray-600 mb-3">
              Fill in the template with seller details and upload it here
            </p>

            <div className="flex items-center space-x-3">
              <label className="flex-1">
                <input
                  type="file"
                  id="csvFileInput"
                  accept=".csv"
                  onChange={handleCSVFileChange}
                  className="hidden"
                />
                <div className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                  <Upload className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">
                    {csvFile ? csvFile.name : 'Choose CSV file'}
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Upload Button */}
          {csvFile && (
            <button
              onClick={handleBulkUpload}
              disabled={uploading}
              className="w-full flex justify-center items-center py-3 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
            >
              {uploading ? (
                <>
                  <Loader className="animate-spin h-5 w-5 mr-2" />
                  Processing {csvFile.name}...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5 mr-2" />
                  Send Bulk Invitations
                </>
              )}
            </button>
          )}

          {/* Instructions */}
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h4 className="font-semibold text-yellow-900 mb-2">📝 CSV Format Instructions</h4>
            <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
              <li>First row must be headers: Email, Shop Name</li>
              <li>Each row after should contain one seller's details</li>
              <li>Email addresses must be valid</li>
              <li>Shop names can contain spaces and special characters</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerInvitation;