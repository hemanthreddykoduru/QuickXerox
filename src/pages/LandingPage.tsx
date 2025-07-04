import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer, CheckCircle, MapPin, CreditCard, Shield } from 'lucide-react';

const features = [
  {
    icon: <CheckCircle className="w-7 h-7 text-blue-500 mb-2" />, 
    title: 'No Waiting',
    description: 'Order online, pick up fast.'
  },
  {
    icon: <MapPin className="w-7 h-7 text-blue-500 mb-2" />, 
    title: 'Nearby Pickup',
    description: 'Find print shops close to you.'
  },
  {
    icon: <CreditCard className="w-7 h-7 text-blue-500 mb-2" />, 
    title: 'Multiple Payments',
    description: 'Pay with cards, UPI, wallets, and more.'
  },
  {
    icon: <Shield className="w-7 h-7 text-blue-500 mb-2" />, 
    title: 'Secure & Private',
    description: 'Your files and payments are always safe.'
  }
];

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-white to-blue-200 flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center px-2 py-8 sm:px-4 sm:py-16">
        <div className="bg-white/80 rounded-xl p-4 sm:p-8 max-w-md w-full flex flex-col items-center shadow-sm">
          <Printer className="h-12 w-12 sm:h-14 sm:w-14 text-blue-600 animate-pulse-slow mb-3 sm:mb-4" />
          <span className="text-blue-700 text-2xl sm:text-3xl font-extrabold mb-3 sm:mb-4 tracking-tight">QuickXerox</span>
          <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-800 mb-1 sm:mb-2 text-center">Get Your Prints, Fast and Easy. Anytime. Anywhere.</h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-600 mb-4 sm:mb-6 text-center">Upload your files, choose print settings, and pick them up at a nearby shop.</p>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 sm:px-8 sm:py-3 rounded-lg shadow transition duration-200 text-sm sm:text-base"
            onClick={() => navigate('/login')}
          >
            Get Started
          </button>
        </div>
        <div className="mt-8 sm:mt-12 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full max-w-md sm:max-w-2xl">
          {features.map((feature, idx) => (
            <div key={idx} className="bg-white/70 rounded-lg sm:rounded-xl p-4 sm:p-6 flex flex-col items-center shadow-sm">
              {feature.icon}
              <h3 className="text-base sm:text-lg font-semibold text-blue-700 mb-1">{feature.title}</h3>
              <p className="text-gray-500 text-center text-xs sm:text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </main>
      <footer className="text-center text-gray-400 py-3 sm:py-4 text-xs mt-auto">
        &copy; {new Date().getFullYear()} QuickXerox
        <div className="mt-1">
          <a href="mailto:workwithquickxerox@email.com" className="text-blue-600 hover:underline">workwithquickxerox@email.com</a>
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