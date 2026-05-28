'use client';

import { useCallback } from 'react';
import { Input } from './input';

function addThousandDots(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

interface MoneyInputProps {
  value: string;           // raw digits only, no separators: "79000000"
  onChange: (raw: string) => void;  // called with raw digits
  placeholder?: string;    // raw digits, will be formatted for display
  className?: string;
  required?: boolean;
  disabled?: boolean;
}

export function MoneyInput({ value, onChange, placeholder, className, required, disabled }: MoneyInputProps) {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\./g, '');
    if (/^\d*$/.test(raw)) onChange(raw);
  }, [onChange]);

  return (
    <Input
      type="text"
      inputMode="numeric"
      value={addThousandDots(value)}
      onChange={handleChange}
      placeholder={placeholder ? addThousandDots(placeholder) : undefined}
      className={className}
      required={required}
      disabled={disabled}
    />
  );
}
