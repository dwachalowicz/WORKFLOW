import { useState, useEffect } from 'react';

interface DebouncedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onChangeValue: (value: string) => void;
  debounceMs?: number;
}

export const DebouncedTextarea = ({ value, onChangeValue, debounceMs = 200, ...props }: DebouncedTextareaProps) => {
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
    <textarea
      {...props}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
    />
  );
};
