import { Check } from '@phosphor-icons/react';
import clsx from 'clsx';
import styles from './ChipSelect.module.css';

export interface ChipOption {
  id: string;
  label: string;
}

interface ChipSelectProps {
  options: readonly ChipOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  tone?: 'clay' | 'moss' | 'tamarind';
  className?: string;
}

export function ChipSelect({
  options,
  selected,
  onChange,
  tone = 'moss',
  className,
}: ChipSelectProps) {
  const selectedSet = new Set(selected);

  const toggle = (id: string) => {
    if (selectedSet.has(id)) {
      onChange(selected.filter((item) => item !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div className={clsx(styles.grid, className)}>
      {options.map((opt) => {
        const active = selectedSet.has(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(opt.id)}
            className={clsx(styles.chip, active && styles.active, active && styles[tone])}
          >
            {active && <Check size={14} weight="bold" aria-hidden="true" />}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
