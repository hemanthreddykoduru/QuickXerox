import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { getCurrentIP, isIPAllowed } from '../utils/ipUtils';

const AdminLogin = () => {
    const [isCheckingIP, setIsCheckingIP] = useState(true);
    const [ipBlocked, setIpBlocked] = useState(false);
    const [userIP, setUserIP] = useState<string | null>(null);

    useEffect(() => {
        const checkIPAccess = async () => {
            try {
                // Get user's current IP
                const currentIP = await getCurrentIP();
                setUserIP(currentIP);

                // Fetch allowed IP ranges from system settings
                const settingsDoc = await getDoc(doc(db, 'systemSettings', 'global'));
                const allowedRanges = settingsDoc.exists()
                    ? settingsDoc.data()?.auth?.allowedAdminIpRanges || []
                    : [];

                // Check if IP is allowed
                if (currentIP && !isIPAllowed(currentIP, allowedRanges)) {
                    setIpBlocked(true);
                    toast.error(`Access denied. Your IP (${currentIP}) is not authorized.`);
                }
            } catch (error) {
                console.error('IP check failed:', error);
                // Allow access if IP check fails (fail open)
            } finally {
                setIsCheckingIP(false);
            }
        };

        checkIPAccess();
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (ipBlocked) {
            toast.error('Access denied from your IP address');
            return;
        }

        // ...existing login code...
    };

    if (isCheckingIP) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-lg text-gray-700">Verifying access...</p>
            </div>
        );
    }

    if (ipBlocked) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
                    <p className="text-gray-700">Your IP address ({userIP}) is not authorized to access this area.</p>
                    <p className="text-sm text-gray-500 mt-2">Contact your administrator if you believe this is an error.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            {/* ...existing login form... */}
        </div>
    );
};

export default AdminLogin;