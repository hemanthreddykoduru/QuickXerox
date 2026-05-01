import React from 'react';
import { Star, Clock, MapPin, Printer } from 'lucide-react';
import { motion } from 'framer-motion';
import { PrintShop } from '../../types';

interface PrintShopCardProps {
  shop: PrintShop;
  isSelected?: boolean;
  onSelect: () => void;
}

const PrintShopCard: React.FC<PrintShopCardProps> = ({ shop, isSelected, onSelect }) => {
  const [hasError, setHasError] = React.useState(false);
  const MotionDiv = motion.div as any;

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`group bg-white rounded-2xl overflow-hidden transition-all duration-300 ${isSelected
        ? 'ring-2 ring-indigo-600 shadow-xl shadow-indigo-50'
        : 'shadow-sm hover:shadow-lg border border-slate-100'
        }`}
    >
      {/* Image Section */}
      <div className="h-44 overflow-hidden bg-gray-50 flex items-center justify-center relative group-hover:bg-white transition-colors">
        {(!shop.image || hasError) ? (
          <div className="absolute inset-0 bg-slate-50 flex items-center justify-center">
            <Printer className="h-10 w-10 text-slate-200" />
          </div>
        ) : (
          <img
            src={shop.image}
            alt={shop.name}
            onError={() => setHasError(true)}
            className="w-full h-full object-contain relative z-10 transition-transform duration-500 group-hover:scale-105"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />

        {/* Status Badge Over Image */}
        <div className="absolute top-3 left-3 z-20">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-sm ${shop.isShopOpen
            ? 'bg-green-500/90 text-white'
            : 'bg-gray-800/90 text-gray-100'
            }`}>
            {shop.isShopOpen && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-200 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
            )}
            {shop.isShopOpen ? 'Open Now' : 'Closed'}
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4">
        <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1 mb-3">
          {shop.name}
        </h3>

        <div className="flex items-center justify-between mb-4 px-0.5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
              <span className="text-xs font-bold text-gray-700">{shop.rating}</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-gray-300" />
            <div className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-xs font-medium text-gray-500">{shop.distance} mi</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-slate-400">
            <Clock className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-tight">{shop.eta} MIN</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-50">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">Starting from</span>
            <span className="text-base font-black text-gray-900">
              ₹{shop.price.toFixed(2)}<span className="text-[10px] text-gray-400 font-medium">/pg</span>
            </span>
          </div>
          <button
            onClick={onSelect}
            className={`relative px-5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 overflow-hidden group/btn ${isSelected
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-50'
              : 'bg-indigo-600 text-white shadow-md shadow-indigo-50 hover:bg-indigo-700'
              }`}
          >
            <span className="relative z-10">{isSelected ? 'Selected' : 'Select Shop'}</span>
            <div className="absolute inset-0 bg-white/10 translate-y-[100%] group-hover/btn:translate-y-0 transition-transform duration-300" />
          </button>
        </div>
      </div>
    </MotionDiv>
  );
};

export default PrintShopCard;