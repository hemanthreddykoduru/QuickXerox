import React from 'react';
import { LucideIcon } from 'lucide-react';

interface FormInputProps {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  icon: LucideIcon;
  required?: boolean;
  placeholder?: string;
  isTextArea?: boolean;
  rows?: number;
}

const FormInput: React.FC<FormInputProps> = ({
  label,
  type = 'text',
  value,
  onChange,
  icon: Icon,
  required = false,
  placeholder,
  isTextArea = false,
  rows = 3,
}) => {
  const inputClasses = "pl-10 block w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500";
  
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="relative rounded-md shadow-sm">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Icon className="h-5 w-5 text-gray-400" />
        </div>
        {isTextArea ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={inputClasses}
            required={required}
            placeholder={placeholder}
            rows={rows}
          />
        ) : (
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={inputClasses}
            required={required}
            placeholder={placeholder}
          />
        )}
      </div>
    </div>
  );
};

export default FormInput;