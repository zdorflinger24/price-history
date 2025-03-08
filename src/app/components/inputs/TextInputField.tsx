import { useState, useEffect } from 'react';

interface TextInputFieldProps {
  label: string;
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
}

export function TextInputField({ label, value, onChange, placeholder }: TextInputFieldProps) {
  const [localValue, setLocalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setLocalValue(value);
    }
  }, [value, isFocused]);

  return (
    <div className="flex flex-col space-y-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => { 
          setIsFocused(false);
          onChange(localValue);
        }}
        className="w-full px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        placeholder={placeholder}
      />
    </div>
  );
} 