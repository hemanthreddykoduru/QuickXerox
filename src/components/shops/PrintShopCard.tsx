import React from 'react';
import { Star, Clock, MapPin, ExternalLink, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { PrintShop } from '../../types';

interface PrintShopCardProps {
  shop: PrintShop;
  isSelected?: boolean;
  onSelect: () => void;
}

const PrintShopCard: React.FC<PrintShopCardProps> = ({ shop, isSelected, onSelect }) => {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`group relative bg-white rounded-2xl overflow-hidden transition-all duration-300 ${
        isSelected 
          ? 'ring-2 ring-blue-500 shadow-xl shadow-blue-100' 
          : 'hover:shadow-2xl hover:shadow-gray-200 border border-gray-100'
      }`}
    >
      {/* Popular Badge */}
      {shop.rating >= 4.5 && (
        <div className="absolute top-3 left-3 z-10">
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-600 text-white shadow-lg">
            <ShieldCheck className="h-3 w-3" />
            Top Rated
          </span>
        </div>
      )}

      {/* Image Section */}
      <div className="relative h-44 overflow-hidden bg-gray-50">
        <img
          src={shop.image}
          alt={shop.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        
        {/* Status Overlay */}
        <div className="absolute top-3 right-3">
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm border ${
            shop.isShopOpen 
              ? 'bg-green-500/90 text-white border-green-400' 
              : 'bg-red-500/90 text-white border-red-400'
          }`}>
            {shop.isShopOpen ? 'Open Now' : 'Closed'}
          </span>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
            {shop.name}
          </h3>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center px-1.5 py-0.5 rounded bg-yellow-50 border border-yellow-100">
            <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
            <span className="ml-1 text-xs font-bold text-yellow-700">{shop.rating}</span>
          </div>
          <div className="h-1 w-1 rounded-full bg-gray-300" />
          <div className="flex items-center text-gray-500">
            <MapPin className="h-3.5 w-3.5 mr-1" />
            <span className="text-xs font-medium">{shop.distance} mi</span>
          </div>
          <div className="h-1 w-1 rounded-full bg-gray-300" />
          <div className="flex items-center text-gray-500">
            <Clock className="h-3.5 w-3.5 mr-1" />
            <span className="text-xs font-medium">{shop.eta}m</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-50">
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-0.5">Starting from</p>
            <span className="text-xl font-black text-gray-900">
              ₹{shop.price.toFixed(2)}<span className="text-sm font-medium text-gray-500">/pg</span>
            </span>
          </div>
          
          <button
            onClick={onSelect}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-300 text-sm font-bold ${
              isSelected
                ? 'bg-green-600 text-white shadow-lg shadow-green-100'
                : 'bg-gray-900 text-white hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-100 active:scale-95'
            }`}
          >
            {isSelected ? (
              <>
                <ShieldCheck className="h-4 w-4" />
                Selected
              </>
            ) : (
              <>
                Select
                <ExternalLink className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default PrintShopCard;