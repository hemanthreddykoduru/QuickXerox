import React, { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';

const IpBlocked = () => {
    const [userIP, setUserIP] = useState<string>('Detecting...');

    useEffect(() => {
        const fetchIP = async () => {
            try {
                const response = await fetch('https://api64.ipify.org?format=json');
                if (!response.ok) throw new Error('Failed to fetch IP');
                const data = await response.json();
                setUserIP(data.ip || 'Unable to detect');
            } catch {
                try {
                    const response = await fetch('https://api.ipify.org?format=json');
                    if (!response.ok) throw new Error('Failed to fetch IP');
                    const data = await response.json();
                    setUserIP(data.ip || 'Unable to detect');
                } catch {
                    setUserIP('Unable to detect');
                }
            }
        };
        fetchIP();
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl p-10 max-w-md w-full text-center">
                <div className="flex justify-center mb-6">
                    <Lock className="h-16 w-16 text-red-500" />
                </div>

                <h1 className="text-3xl font-bold text-gray-900 mb-3">
                    Access Denied
                </h1>

                <p className="text-gray-600 text-lg mb-6">
                    Your IP address is not authorized to access this area.
                </p>

                <div className="bg-gray-50 border-l-4 border-red-500 rounded p-4 mb-6 text-left">
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-semibold">
                        Your IP Address
                    </div>
                    <div className="font-mono text-xl font-bold text-gray-900 break-all">
                        {userIP}
                    </div>
                </div>

                <p className="text-sm text-gray-500 mb-8">
                    This is an admin-only section. If you believe this is an error, please contact your administrator.
                </p>

                <a
                    href="/"
                    className="inline-block bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                >
                    Go to Home
                </a>

                <div className="mt-10 text-xs text-gray-400">
                    <p>QuickXerox Admin Panel</p>
                </div>
            </div>
        </div>
    );
};

export default IpBlocked;
