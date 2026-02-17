import { useNavigate } from 'react-router-dom';
import { Settings, Phone, Mail, Lock } from 'lucide-react';

const MaintenancePage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full text-center space-y-6">
                <div className="flex justify-center">
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center animate-pulse">
                        <Settings className="w-10 h-10 text-blue-600 animate-spin-slow" />
                    </div>
                </div>

                <h1 className="text-3xl font-bold text-gray-900">Under Maintenance</h1>

                <p className="text-gray-600">
                    We are currently upgrading our system to serve you better.
                    Please check back shortly. We apologize for the inconvenience.
                </p>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 space-y-4">
                    <div className="flex items-center space-x-3 text-sm text-gray-600">
                        <Mail className="w-5 h-5 text-gray-400" />
                        <span>support@quickxerox.com</span>
                    </div>
                    <div className="flex items-center space-x-3 text-sm text-gray-600">
                        <Phone className="w-5 h-5 text-gray-400" />
                        <span>+91 98765 43210</span>
                    </div>
                </div>

                <div className="pt-8">
                    <button
                        onClick={() => navigate('/admin/login')}
                        className="flex items-center justify-center space-x-2 w-full text-gray-500 hover:text-gray-900 transition-colors text-sm"
                    >
                        <Lock className="w-4 h-4" />
                        <span>Admin Login</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MaintenancePage;
