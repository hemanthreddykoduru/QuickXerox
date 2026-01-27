import React from 'react';
import { ChevronLeft, Mail, Phone, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ContactPage = () => {
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

                <h1 className="text-3xl font-bold text-gray-900 mb-8">Contact Us</h1>

                <div className="space-y-8 text-gray-600">
                    <p className="text-lg">
                        Have questions or need assistance? We're here to help! Reach out to us using the contact details below.
                    </p>

                    <div className="grid gap-6 md:grid-cols-2 mt-8">
                        <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
                            <div className="flex items-center mb-4">
                                <div className="bg-blue-100 p-2 rounded-full mr-3">
                                    <Mail className="h-6 w-6 text-blue-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">Email Us</h3>
                            </div>
                            <p className="mb-4">For general inquiries and support:</p>
                            <a href="mailto:help-contact@quickxerox.app" className="text-blue-600 font-medium hover:underline">
                                help-contact@quickxerox.app
                            </a>
                        </div>

                        <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
                            <div className="flex items-center mb-4">
                                <div className="bg-blue-100 p-2 rounded-full mr-3">
                                    <Phone className="h-6 w-6 text-blue-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">Call Us</h3>
                            </div>
                            <p className="mb-4">Mon-Fri from 9am to 6pm:</p>
                            <a href="tel:+919876543210" className="text-blue-600 font-medium hover:underline">
                                +91 9876543210
                            </a>
                        </div>
                    </div>

                    <div className="mt-8 pt-8 border-t border-gray-100">
                        <div className="flex items-start">
                            <div className="bg-gray-100 p-2 rounded-full mr-4 shrink-0">
                                <MapPin className="h-6 w-6 text-gray-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Office Location</h3>
                                <p>
                                    Gitam University<br />
                                    Bengaluru, Karnataka<br />
                                    India
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContactPage;
