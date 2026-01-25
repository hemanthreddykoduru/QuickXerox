import React from 'react';
import { Phone } from 'lucide-react';

interface MobileInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const MobileInput: React.FC<MobileInputProps> = ({ value, onChange, disabled }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.replace(/\D/g, ''); // Remove non-digit characters
    if (input.length <= 10) {
      onChange(input); // Allow only up to 10 digits
    }
  };

  return (
    <div>
      <label htmlFor="mobile" className="block text-sm font-medium text-gray-700">
        Mobile Number
      </label>
      <div className="mt-1 relative rounded-md shadow-sm">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Phone className="h-5 w-5 text-gray-400" />
        </div>
        <input
          id="mobile"
          type="tel"
          value={value}
          onChange={handleChange}
          disabled={disabled}
          className="pl-10 block w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
          placeholder="Enter 10-digit number"
        />
      </div>
    </div>
  );
};

export default MobileInput;
