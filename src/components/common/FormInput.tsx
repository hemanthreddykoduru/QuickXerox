import React from 'react';
import { LucideIcon } from 'lucide-react';

interface FormInputProps {
  label: string;
  type?: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  maxLength?: number;
  placeholder?: string;
  icon?: LucideIcon;
}

const FormInput: React.FC<FormInputProps> = ({
  label,
  type = 'text',
  name,
  value,
  onChange,
  required = false,
  error,
  disabled = false,
  maxLength,
  placeholder,
  icon: Icon
}) => {
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-gray-400" />
          </div>
        )}
        <input
          type={type}
          name={name}
          id={name}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          maxLength={maxLength}
          placeholder={placeholder}
          className={`
            block w-full rounded-md shadow-sm
            ${Icon ? 'pl-10' : 'pl-3'}
            ${error ? 'border-red-300' : 'border-gray-300'}
            ${disabled ? 'bg-gray-100' : 'bg-white'}
            focus:ring-blue-500 focus:border-blue-500 sm:text-sm
          `}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default FormInput;