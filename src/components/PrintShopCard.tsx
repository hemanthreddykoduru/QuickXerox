import React from 'react';
import { Star, Clock, MapPin } from 'lucide-react';
import { PrintShop } from '../types';

interface PrintShopCardProps {
  shop: PrintShop;
  isSelected?: boolean;
  onSelect: () => void;
}

const PrintShopCard: React.FC<PrintShopCardProps> = ({ shop, isSelected, onSelect }) => {
  return (
    <div className={`bg-white rounded-xl shadow-md overflow-hidden transition-all ${
      isSelected ? 'ring-2 ring-blue-600' : 'hover:shadow-lg'
    }`}>
      <div className="h-48 overflow-hidden">
        <img
          src={shop.image}
          alt={shop.name}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{shop.name}</h3>
        <div className="mb-2">
          {shop.isShopOpen ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Open
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              Closed
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2 mb-3">
          <div className="flex items-center">
            <Star className="h-4 w-4 text-yellow-400" />
            <span className="ml-1 text-xs text-gray-600">{shop.rating}</span>
          </div>
          <div className="flex items-center">
            <MapPin className="h-4 w-4 text-gray-400" />
            <span className="ml-1 text-xs text-gray-600">{shop.distance} mi</span>
          </div>
          <div className="flex items-center">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="ml-1 text-xs text-gray-600">{shop.eta} mins</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-base font-semibold text-gray-900">
          ₹{(shop.price + 1).toFixed(2)}/page
          </span>
          <button 
            onClick={onSelect}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              isSelected
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isSelected ? 'Selected' : 'Select'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrintShopCard;