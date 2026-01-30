import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const RefundPage = () => {
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

                <h1 className="text-3xl font-bold text-gray-900 mb-8">Refund Policy</h1>

                <div className="prose prose-blue max-w-none text-gray-600 space-y-6">
                    <p>Last updated: {new Date().toLocaleDateString()}</p>

                    <h2 className="text-xl font-semibold text-gray-900">1. General Policy</h2>
                    <p>
                        At QuickXerox, we strive for customer satisfaction. However, due to the customized nature of printing services, we generally do not offer refunds once an order has been processed and printed by the shop.
                    </p>

                    <h2 className="text-xl font-semibold text-gray-900">2. Eligible Situations for Refund</h2>
                    <p>
                        Refunds may be considered in the following situations:
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>The order was cancelled before the print shop started processing it.</li>
                            <li>There was a technical error with the file processing on our end.</li>
                            <li>The print quality is significantly defective due to printer error (verification required).</li>
                        </ul>
                    </p>

                    <h2 className="text-xl font-semibold text-gray-900">3. How to Request a Refund</h2>
                    <p>
                        To request a refund, please contact our support team at help-contact@quickxerox.app within 24 hours of your order pickup. Please include your Order ID and photos of the defective prints if applicable.
                    </p>

                    <h2 className="text-xl font-semibold text-gray-900">4. Processing Time</h2>
                    <p>
                        Approved refunds will be processed within 5-7 business days and credited back to the original method of payment.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RefundPage;
