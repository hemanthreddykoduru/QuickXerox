import React, { useState, useEffect } from 'react';
import { Mail, Send, Upload, Download, FileSpreadsheet, Loader, Eye, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { auth, db } from '../../firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

// Type definitions
interface Seller {
  email: string;
  shopName: string;
}

interface FailedSeller extends Seller {
  error: string;
}

interface ValidationError {
  row: number;
  field: string;
  value: string;
  error: string;
}

interface Duplicate {
  email: string;
  reason: string;
}

const SellerInvitation = () => {
  // Basic state
  const [email, setEmail] = useState('');
  const [shopName, setShopName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [uploadMode, setUploadMode] = useState<'single' | 'bulk'>('single');

  // CSV state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedSellers, setParsedSellers] = useState<Seller[]>([]);
  const [uploading, setUploading] = useState(false);

  // New features state
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [failedSellers, setFailedSellers] = useState<FailedSeller[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewEmail, setPreviewEmail] = useState<any>(null);
  const [duplicates, setDuplicates] = useState<Duplicate[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  useEffect(() => {

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const adminDoc = await getDoc(doc(db, 'admins', user.uid));
          setIsAdmin(adminDoc.exists());
          if (!adminDoc.exists()) {
            toast.error('You do not have admin privileges');
          }
        } catch (error) {
          console.error('Error checking admin status:', error);
          toast.error('Error checking admin status');
        }
      } else {
        setIsAdmin(false);
      }
      setIsLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  // Single invitation submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAdmin) {
      toast.error('Only admins can send invitations');
      return;
    }

    setIsLoading(true);

    try {
      const user = auth.currentUser;

      const invitationRef = await addDoc(collection(db, 'sellerInvitations'), {
        email,
        shopName,
        status: 'pending',
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdBy: user?.uid
      });

      const invitationLink = `${window.location.origin}/seller-invitation?id=${invitationRef.id}`;

      try {
        const response = await fetch('/api/send-invitation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            shopName,
            invitationLink
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to send email API response');
        }

        toast.success(`Invitation sent to ${email}!`);
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        toast.error(`Invitation created but email failed to send.`);
      }

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
  const parseCSV = (text: string): Seller[] => {
    const lines = text.trim().split('\n');
    const sellers: Seller[] = [];

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

  // NEW FEATURE 4: CSV Validation
  const validateCSV = (sellers: Seller[]): ValidationError[] => {
    const errors: ValidationError[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const seenEmails = new Set<string>();

    sellers.forEach((seller, index) => {
      const row = index + 2; // +2 for header and 0-index

      // Email format validation
      if (!emailRegex.test(seller.email)) {
        errors.push({
          row,
          field: 'Email',
          value: seller.email,
          error: 'Invalid email format'
        });
      }

      // Duplicate within CSV
      if (seenEmails.has(seller.email.toLowerCase())) {
        errors.push({
          row,
          field: 'Email',
          value: seller.email,
          error: 'Duplicate email in CSV'
        });
      }
      seenEmails.add(seller.email.toLowerCase());

      // Shop name validation
      if (!seller.shopName || seller.shopName.trim().length < 3) {
        errors.push({
          row,
          field: 'Shop Name',
          value: seller.shopName,
          error: 'Must be at least 3 characters'
        });
      }
    });

    return errors;
  };

  // NEW FEATURE 5: Duplicate Detection
  const checkDuplicates = async (sellers: Seller[]): Promise<Duplicate[]> => {
    const found: Duplicate[] = [];

    for (const seller of sellers) {
      // Check existing sellers
      const sellerQuery = query(
        collection(db, 'shopOwners'),
        where('email', '==', seller.email)
      );
      const sellerSnap = await getDocs(sellerQuery);

      if (!sellerSnap.empty) {
        found.push({
          email: seller.email,
          reason: 'Already a registered seller'
        });
        continue;
      }

      // Check pending invitations
      const inviteQuery = query(
        collection(db, 'sellerInvitations'),
        where('email', '==', seller.email),
        where('status', '==', 'pending')
      );
      const inviteSnap = await getDocs(inviteQuery);

      if (!inviteSnap.empty) {
        found.push({
          email: seller.email,
          reason: 'Has pending invitation'
        });
      }
    }

    return found;
  };

  // Handle CSV File Selection
  const handleCSVFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      if (!file.name.endsWith('.csv')) {
        toast.error('Please upload a CSV file');
        return;
      }

      setCsvFile(file);

      // Parse and validate immediately
      try {
        const text = await file.text();
        const sellers = parseCSV(text);

        if (sellers.length === 0) {
          toast.error('No valid seller data found in CSV');
          return;
        }

        setParsedSellers(sellers);

        // Validate
        const errors = validateCSV(sellers);
        setValidationErrors(errors);

        if (errors.length > 0) {
          toast.error(`Found ${errors.length} validation errors`);
        } else {
          toast.success(`Loaded ${sellers.length} sellers`);

          // Check for duplicates
          setCheckingDuplicates(true);
          const dups = await checkDuplicates(sellers);
          setDuplicates(dups);
          setCheckingDuplicates(false);

          if (dups.length > 0) {
            toast.error(`Found ${dups.length} duplicate emails`);
          }
        }
      } catch (error) {
        toast.error('Failed to parse CSV file');
        console.error(error);
      }
    }
  };

  // NEW FEATURE 3: Email Preview
  const generatePreview = () => {
    if (!parsedSellers || parsedSellers.length === 0) {
      toast.error('No sellers loaded');
      return;
    }

    const firstSeller = parsedSellers[0];

    setPreviewEmail({
      to: firstSeller.email,
      subject: 'Invitation to join QuickXerox',
      shopName: firstSeller.shopName,
      invitationLink: `${window.location.origin}/seller-invitation?id=SAMPLE_ID`,
      fromName: 'QuickXerox Admin'
    });

    setShowPreview(true);
  };

  // NEW FEATURE 2: Download Failed CSV
  const downloadFailedCSV = () => {
    const header = 'Email,Shop Name,Error Reason\n';
    const rows = failedSellers.map(s =>
      `${s.email},"${s.shopName}","${s.error}"`
    ).join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `failed_invitations_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success('Failed invitations CSV downloaded!');
  };

  // Skip duplicates
  const skipDuplicates = () => {
    const filtered = parsedSellers.filter(s =>
      !duplicates.some(d => d.email === s.email)
    );
    setParsedSellers(filtered);
    setDuplicates([]);
    toast.success(`Skipped ${duplicates.length} duplicates. ${filtered.length} sellers remaining.`);
  };

  // Process Bulk Upload with NEW FEATURE 1: Progress Bar
  const handleBulkUpload = async () => {
    if (!parsedSellers || parsedSellers.length === 0) {
      toast.error('Please select a CSV file first');
      return;
    }

    // Don't allow upload if validation errors exist
    if (validationErrors.length > 0) {
      toast.error('Please fix validation errors before uploading');
      return;
    }

    setUploading(true);
    setFailedSellers([]); // Reset failures
    setProgress({ current: 0, total: parsedSellers.length });

    const user = auth.currentUser;
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < parsedSellers.length; i++) {
      const seller = parsedSellers[i];

      try {
        const invitationRef = await addDoc(collection(db, 'sellerInvitations'), {
          email: seller.email,
          shopName: seller.shopName,
          status: 'pending',
          createdAt: serverTimestamp(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdBy: user?.uid
        });

        const invitationLink = `${window.location.origin}/seller-invitation?id=${invitationRef.id}`;

        try {
          const response = await fetch('/api/send-invitation', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: seller.email,
              shopName: seller.shopName,
              invitationLink
            }),
          });

          if (!response.ok) {
            throw new Error('Network response was not ok');
          }

          successCount++;
        } catch (emailError: any) {
          console.error(`Email failed for ${seller.email}:`, emailError);
          failCount++;
          setFailedSellers(prev => [...prev, {
            ...seller,
            error: emailError.message || 'Email sending failed'
          }]);
        }

        // Update progress
        setProgress({ current: i + 1, total: parsedSellers.length });

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error: any) {
        console.error(`Failed to invite ${seller.email}:`, error);
        failCount++;
        setFailedSellers(prev => [...prev, {
          ...seller,
          error: error.message || 'Unknown error'
        }]);

        // Update progress even on failure
        setProgress({ current: i + 1, total: parsedSellers.length });
      }
    }

    toast.success(`Successfully sent ${successCount} invitations!`);
    if (failCount > 0) {
      toast.error(`Failed to send ${failCount} invitations`);
    }

    setUploading(false);
  };

  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Access Denied</h2>
        <p className="text-red-600">You need to be logged in as an admin to access this page.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-md">
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
          {/* Download Template */}
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

            <label className="block">
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

            {checkingDuplicates && (
              <div className="mt-3 flex items-center text-sm text-gray-600">
                <Loader className="animate-spin h-4 w-4 mr-2" />
                Checking for duplicates...
              </div>
            )}
          </div>

          {/* FEATURE 4: Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-bold text-red-900 flex items-center mb-3">
                <XCircle className="h-5 w-5 mr-2" />
                {validationErrors.length} Validation Error{validationErrors.length > 1 ? 's' : ''}
              </h4>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {validationErrors.map((err, i) => (
                  <div key={i} className="text-sm">
                    <span className="font-semibold text-red-800">Row {err.row}:</span>{' '}
                    <span className="text-red-700">{err.field} - {err.error}</span>
                    <br />
                    <span className="text-red-600 text-xs">Value: "{err.value}"</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FEATURE 5: Duplicate Detection */}
          {duplicates.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-bold text-yellow-900 flex items-center mb-3">
                <AlertCircle className="h-5 w-5 mr-2" />
                {duplicates.length} Duplicate Email{duplicates.length > 1 ? 's' : ''} Found
              </h4>
              <div className="max-h-32 overflow-y-auto space-y-1 mb-3">
                {duplicates.map((dup, i) => (
                  <div key={i} className="text-sm text-yellow-800">
                    <strong>{dup.email}</strong> - {dup.reason}
                  </div>
                ))}
              </div>
              <button
                onClick={skipDuplicates}
                className="text-sm bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 transition-colors"
              >
                Skip Duplicates and Continue ({parsedSellers.length - duplicates.length} will be invited)
              </button>
            </div>
          )}

          {/* FEATURE 3: Email Preview Button */}
          {parsedSellers.length > 0 && validationErrors.length === 0 && (
            <button
              onClick={generatePreview}
              className="w-full flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
            >
              <Eye className="h-5 w-5 mr-2" />
              Preview Email
            </button>
          )}

          {/* FEATURE 1: Progress Bar */}
          {uploading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-blue-900">
                  <span className="font-semibold">Processing invitations...</span>
                  <span>{progress.current} / {progress.total}</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-blue-700 text-center font-medium">
                  {Math.round((progress.current / progress.total) * 100)}% complete
                </p>
              </div>
            </div>
          )}

          {/* Upload Button */}
          {parsedSellers.length > 0 && !uploading && (
            <button
              onClick={handleBulkUpload}
              disabled={validationErrors.length > 0}
              className="w-full flex justify-center items-center py-3 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
            >
              <Send className="h-5 w-5 mr-2" />
              Send {parsedSellers.length} Invitation{parsedSellers.length > 1 ? 's' : ''}
            </button>
          )}

          {/* FEATURE 2: Download Failed CSV */}
          {failedSellers.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-bold text-red-900 flex items-center mb-3">
                <XCircle className="h-5 w-5 mr-2" />
                {failedSellers.length} Failed Invitation{failedSellers.length > 1 ? 's' : ''}
              </h4>
              <button
                onClick={downloadFailedCSV}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                <Download className="h-5 w-5 mr-2" />
                Download Failed CSV ({failedSellers.length})
              </button>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h4 className="font-semibold text-yellow-900 mb-2">📝 CSV Format Instructions</h4>
            <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
              <li>First row must be headers: Email, Shop Name</li>
              <li>Each row after should contain one seller's details</li>
              <li>Email addresses must be valid format</li>
              <li>Shop names must be at least 3 characters</li>
            </ul>
          </div>
        </div>
      )}

      {/* FEATURE 3: Email Preview Modal */}
      {showPreview && previewEmail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Email Preview</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
              <div>
                <span className="font-semibold text-gray-700">To:</span>{' '}
                <span className="text-gray-900">{previewEmail.to}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Subject:</span>{' '}
                <span className="text-gray-900">{previewEmail.subject}</span>
              </div>
              <hr className="my-3" />
              <div className="bg-white p-4 rounded border">
                <p className="mb-3">Hi <strong>{previewEmail.shopName}</strong>,</p>
                <p className="mb-3">
                  You're invited to join QuickXerox as a print shop partner!
                  We're building a platform to connect customers with local print shops,
                  and we'd love to have you on board.
                </p>
                <p className="mb-3">Click the link below to get started:</p>
                <a
                  href="#"
                  className="text-blue-600 underline break-all"
                  onClick={(e) => e.preventDefault()}
                >
                  {previewEmail.invitationLink}
                </a>
                <p className="mt-4">
                  Thanks,<br />
                  <strong>{previewEmail.fromName}</strong>
                </p>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerInvitation;