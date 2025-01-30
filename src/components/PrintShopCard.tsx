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
      <div className="p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{shop.name}</h3>
        
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex items-center">
            <Star className="h-5 w-5 text-yellow-400" />
            <span className="ml-1 text-sm text-gray-600">{shop.rating}</span>
          </div>
          <div className="flex items-center">
            <MapPin className="h-5 w-5 text-gray-400" />
            <span className="ml-1 text-sm text-gray-600">{shop.distance} mi</span>
          </div>
          <div className="flex items-center">
            <Clock className="h-5 w-5 text-gray-400" />
            <span className="ml-1 text-sm text-gray-600">{shop.eta} mins</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold text-gray-900">
            ${shop.price.toFixed(2)}/page
          </span>
          <button 
            onClick={onSelect}
            className={`px-4 py-2 rounded-md transition-colors ${
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