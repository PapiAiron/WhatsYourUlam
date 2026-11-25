import { useEffect, useState } from 'react';
import clsx from 'clsx';
import type { CurrencyCode } from '@shared/index';
import styles from './CurrencyInput.module.css';

const SYMBOLS: Record<CurrencyCode, string> = {
  PHP: '₱',
  MYR: 'RM',
  JPY: '¥',
  USD: '$',
};

interface CurrencyInputProps {
  id?: string;
  currency?: CurrencyCode;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}

export function CurrencyInput({
  id,
  currency = 'PHP',
  value,
  onChange,
  min = 0,
  max = 1000000,
  placeholder,
  ariaLabel,
  className,
}: CurrencyInputProps) {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState(String(value));

  useEffect(() => {
    if (!focused) {
      setRaw(value ? value.toLocaleString('en-US') : '');
    }
  }, [value, focused]);

  return (
    <div className={clsx(styles.wrap, className)}>
      <span className={styles.symbol} aria-hidden="true">
        {SYMBOLS[currency]}
      </span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        aria-label={ariaLabel}
        placeholder={placeholder}
        className={styles.input}
        value={focused ? raw : value ? value.toLocaleString('en-US') : ''}
        onFocus={() => {
          setFocused(true);
          setRaw(value ? String(value) : '');
        }}
        onChange={(e) => {
          const cleaned = e.target.value.replace(/[^0-9.]/g, '');
          setRaw(cleaned);
          const num = Number(cleaned);
          if (Number.isFinite(num)) {
            onChange(Math.min(max, Math.max(0, num)));
          }
        }}
        onBlur={() => {
          setFocused(false);
          const parsed = Number(raw);
          const clamped = Number.isFinite(parsed)
            ? Math.min(max, Math.max(min, Math.round(parsed * 100) / 100))
            : min;
          onChange(clamped);
          setRaw(clamped.toLocaleString('en-US'));
        }}
      />
    </div>
  );
}
