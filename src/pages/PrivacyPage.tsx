import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PrivacyPage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-8 sm:p-12">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center text-gray-600 hover:text-blue-600 mb-8 transition-colors"
                >
                    <ChevronLeft className="h-5 w-5 mr-1" />
                    Back
                </button>

                <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>

                <div className="prose prose-blue max-w-none text-gray-600 space-y-6">
                    <p>Last updated: {new Date().toLocaleDateString()}</p>

                    <h2 className="text-xl font-semibold text-gray-900">1. Information We Collect</h2>
                    <p>
                        We collect information you provide directly to us, such as when you create an account, upload files, or contact customer support. This may include your name, email address, phone number, and payment information.
                    </p>

                    <h2 className="text-xl font-semibold text-gray-900">2. How We Use Your Information</h2>
                    <p>
                        We use your information to provide, maintain, and improve our services, process transactions, send you technical notices and support messages, and communicate with you about products, services, and events.
                    </p>

                    <h2 className="text-xl font-semibold text-gray-900">3. Data Security</h2>
                    <p>
                        We implement appropriate technical and organizational measures to protect your personal data against unauthorized or unlawful processing, accidental loss, destruction, or damage.
                    </p>

                    <h2 className="text-xl font-semibold text-gray-900">4. File Retention</h2>
                    <p>
                        Files uploaded for printing are retained for a limited period to facilitate your orders and are then automatically deleted from our servers to ensure your privacy.
                    </p>

                    <h2 className="text-xl font-semibold text-gray-900">5. Third-Party Sharing</h2>
                    <p>
                        We do not sell your personal information. We may share your information with third-party service providers who assist us in operating our website, conducting our business, or servicing you (e.g., print shop partners, payment processors).
                    </p>

                    <h2 className="text-xl font-semibold text-gray-900">6. Contact Us</h2>
                    <p>
                        If you have any questions about this Privacy Policy, please contact us at help-contact@quickxerox.app.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPage;
