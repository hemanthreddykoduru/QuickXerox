import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer, CheckCircle, MapPin, CreditCard, Shield, Mail, Phone } from 'lucide-react';

const features = [
  {
    icon: <CheckCircle className="w-7 h-7 text-blue-500 mb-2" />,
    title: 'No Waiting',
    description: 'Order online, pick up fast.',
  },
  {
    icon: <MapPin className="w-7 h-7 text-blue-500 mb-2" />,
    title: 'Nearby Pickup',
    description: 'Find print shops close to you.',
  },
  {
    icon: <CreditCard className="w-7 h-7 text-blue-500 mb-2" />,
    title: 'Multiple Payments',
    description: 'Pay with cards, UPI, wallets, and more.',
  },
  {
    icon: <Shield className="w-7 h-7 text-blue-500 mb-2" />,
    title: 'Secure & Private',
    description: 'Your files and payments are always safe.',
  },
];

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const handleContactClick = () => {
    // You can implement a contact modal or navigate to a contact page
    window.location.href = 'mailto:workwithquickxerox@email.com';
  };

  const handlePolicyClick = (policyType: string) => {
    // You can implement modals or navigate to policy pages
    switch (policyType) {
      case 'shipping':
        alert(
          'Shipping Policy: Orders are typically ready for pickup within 2-4 hours during business hours. Express service available for urgent orders.'
        );
        break;
      case 'terms':
        alert(
          'Terms and Conditions: By using QuickXerox, you agree to our terms of service. Users must be 18+ to place orders. We reserve the right to refuse service.'
        );
        break;
      case 'cancellations':
        alert(
          'Cancellations and Refunds: Orders can be cancelled within 30 minutes of placement. Refunds are processed within 3-5 business days to the original payment method.'
        );
        break;
      case 'privacy':
        alert(
          'Privacy Policy: We collect only necessary information for order processing. Your files are automatically deleted after 24 hours. We never share your personal data with third parties.'
        );
        break;
      default:
        break;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-white to-blue-200 flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center px-2 py-8 sm:px-4 sm:py-16">
        <div className="bg-white/80 rounded-xl p-4 sm:p-8 max-w-md w-full flex flex-col items-center shadow-sm">
          <Printer className="h-12 w-12 sm:h-14 sm:w-14 text-blue-600 animate-pulse-slow mb-3 sm:mb-4" />
          <span className="text-blue-700 text-2xl sm:text-3xl font-extrabold mb-3 sm:mb-4 tracking-tight">
            QuickXerox
          </span>
          <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-800 mb-1 sm:mb-2 text-center">
            Get Your Prints, Fast and Easy. Anytime. Anywhere.
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-600 mb-4 sm:mb-6 text-center">
            Upload your files, choose print settings, and pick them up at a nearby shop.
          </p>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 sm:px-8 sm:py-3 rounded-lg shadow transition duration-200 text-sm sm:text-base"
            onClick={() => navigate('/login')}
          >
            Get Started
          </button>
        </div>
        <div className="mt-8 sm:mt-12 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full max-w-md sm:max-w-2xl">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="bg-white/70 rounded-lg sm:rounded-xl p-4 sm:p-6 flex flex-col items-center shadow-sm"
            >
              {feature.icon}
              <h3 className="text-base sm:text-lg font-semibold text-blue-700 mb-1">
                {feature.title}
              </h3>
              <p className="text-gray-500 text-center text-xs sm:text-sm">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white/90 mt-12 sm:mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Company Info */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center mb-4">
                <Printer className="h-8 w-8 text-blue-600 mr-3" />
                <span className="text-xl font-bold text-blue-700">QuickXerox</span>
              </div>
              <p className="text-gray-600 mb-4 text-sm">
                Your trusted partner for quick and reliable printing services. Upload, order, and
                pick up your prints from nearby shops.
              </p>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-2" />
                  <a
                    href="mailto:workwithquickxerox@email.com"
                    className="hover:text-blue-600"
                  >
                    workwithquickxerox@email.com
                  </a>
                </div>
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-2" />
                  <span>(+123) 456-7890</span>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <button
                    onClick={handleContactClick}
                    className="text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    Contact Us
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => handlePolicyClick('shipping')}
                    className="text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    Shipping Policy
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => handlePolicyClick('terms')}
                    className="text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    Terms & Conditions
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => handlePolicyClick('cancellations')}
                    className="text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    Cancellations & Refunds
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => handlePolicyClick('privacy')}
                    className="text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    Privacy Policy
                  </button>
                </li>
              </ul>
            </div>

            {/* Services */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Services</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>Document Printing</li>
                <li>Photo Printing</li>
                <li>Banner Printing</li>
                <li>Business Cards</li>
                <li>Express Service</li>
              </ul>
            </div>
          </div>

          {/* Bottom Footer */}
          <div className="border-t border-gray-200 mt-8 pt-8 flex flex-col sm:flex-row justify-between items-center">
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} QuickXerox. All rights reserved.
            </p>
            <div className="flex space-x-4 mt-4 sm:mt-0">
              <button
                onClick={() => handlePolicyClick('privacy')}
                className="text-xs text-gray-500 hover:text-blue-600"
              >
                Privacy
              </button>
              <button
                onClick={() => handlePolicyClick('terms')}
                className="text-xs text-gray-500 hover:text-blue-600"
              >
                Terms
              </button>
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 2s cubic-bezier(.4,0,.6,1) infinite;
        }
      `}</style>
    </div>
  );
};

export default LandingPage;