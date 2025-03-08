import { useState, useEffect } from 'react';

interface InputFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  isCount?: boolean;
}

export function InputField({ label, value, onChange, isCount = false }: InputFieldProps) {
  const [localValue, setLocalValue] = useState(isCount ? value.toString() : value.toString());
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setLocalValue(isCount ? value.toString() : value.toString());
    }
  }, [value, isFocused, isCount]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (localValue === '' || localValue === '.') {
      setLocalValue(isCount ? '0' : '0.0000');
      onChange(0);
      return;
    }
    const parsedValue = parseFloat(localValue);
    if (!isNaN(parsedValue)) {
      const finalValue = isCount ? Math.floor(parsedValue) : Number(parsedValue.toFixed(4));
      onChange(finalValue);
      setLocalValue(finalValue.toString());
    }
  };

  return (
    <div className="flex flex-col space-y-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input
        type="number"
        value={localValue}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        className="w-full px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        step={isCount ? 1 : 0.0001}
      />
    </div>
  );
} 