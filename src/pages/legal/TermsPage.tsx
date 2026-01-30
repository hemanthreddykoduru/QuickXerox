import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TermsPage = () => {
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

                <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms of Service</h1>

                <div className="prose prose-blue max-w-none text-gray-600 space-y-6">
                    <p>Last updated: {new Date().toLocaleDateString()}</p>

                    <h2 className="text-xl font-semibold text-gray-900">1. Introduction</h2>
                    <p>
                        Welcome to QuickXerox. By using our website and services, you agree to comply with and be bound by the following terms and conditions. Please review them carefully.
                    </p>

                    <h2 className="text-xl font-semibold text-gray-900">2. Service Description</h2>
                    <p>
                        QuickXerox connects users with local print shops for document printing services. We facilitate file uploads, order processing, and payments but do not own or operate the print shops directly.
                    </p>

                    <h2 className="text-xl font-semibold text-gray-900">3. User Responsibilities</h2>
                    <p>
                        You are responsible for the content of the files you upload. You agree not to upload any illegal, offensive, or copyright-infringing material. QuickXerox reserves the right to terminate accounts that violate this policy.
                    </p>

                    <h2 className="text-xl font-semibold text-gray-900">4. Payments and Pricing</h2>
                    <p>
                        Prices are determined by individual print shops and may vary. Payments are processed securely through our payment partners. All fees are non-refundable unless otherwise stated in our Refund Policy.
                    </p>

                    <h2 className="text-xl font-semibold text-gray-900">5. Limitation of Liability</h2>
                    <p>
                        QuickXerox is not liable for any damages arising from the use of our service, including but not limited to direct, indirect, incidental, or consequential damages.
                    </p>

                    <h2 className="text-xl font-semibold text-gray-900">6. Contact Information</h2>
                    <p>
                        For any questions regarding these Terms of Service, please contact us at help-contact@quickxerox.app.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TermsPage;
