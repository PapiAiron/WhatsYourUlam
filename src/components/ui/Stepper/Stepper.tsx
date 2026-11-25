import { Minus, Plus } from '@phosphor-icons/react';
import clsx from 'clsx';
import styles from './Stepper.module.css';

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unitLabel?: string;
  label?: string;
  className?: string;
}

export function Stepper({
  value,
  onChange,
  min = 1,
  max = 31,
  step = 1,
  unitLabel,
  label,
  className,
}: StepperProps) {
  return (
    <div className={clsx(styles.wrap, className)} role="group" aria-label={label}>
      <button
        type="button"
        className={styles.btn}
        onClick={() => onChange(Math.max(min, value - step))}
        disabled={value <= min}
        aria-label={`Decrease ${label ?? 'value'}`}
      >
        <Minus size={16} weight="bold" />
      </button>
      <span className={styles.readout}>
        <span className={styles.num}>{value}</span>
        {unitLabel && <span className={styles.unit}>{unitLabel}</span>}
      </span>
      <button
        type="button"
        className={styles.btn}
        onClick={() => onChange(Math.min(max, value + step))}
        disabled={value >= max}
        aria-label={`Increase ${label ?? 'value'}`}
      >
        <Plus size={16} weight="bold" />
      </button>
    </div>
  );
}
