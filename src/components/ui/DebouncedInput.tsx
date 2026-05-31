import { useState, useEffect } from 'react';

interface DebouncedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onChangeValue: (value: string) => void;
  debounceMs?: number;
}

export const DebouncedInput = ({ value, onChangeValue, debounceMs = 200, ...props }: DebouncedInputProps) => {
  const [localValue, setLocalValue] = useState(value);
  const [prevValue, setPrevValue] = useState(value);

  if (value !== prevValue) {
    setPrevValue(value);
    setLocalValue(value);
  }

  useEffect(() => {
    if (localValue === value) return;
    
    const timeout = setTimeout(() => {
      onChangeValue(localValue);
    }, debounceMs);

    return () => clearTimeout(timeout);
  }, [localValue, value, onChangeValue, debounceMs]);

  return (
    <input
      {...props}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
    />
  );
};
