import * as RadixSwitch from '@radix-ui/react-switch';
import clsx from 'clsx';
import styles from './Switch.module.css';

interface SwitchProps {
  id?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  className?: string;
}

export function Switch({
  id,
  checked,
  onCheckedChange,
  label,
  description,
  className,
}: SwitchProps) {
  return (
    <div className={clsx(styles.row, className)}>
      {(label || description) && (
        <div className={styles.textCol}>
          {label && (
            <label htmlFor={id} className={styles.label}>
              {label}
            </label>
          )}
          {description && <span className={styles.desc}>{description}</span>}
        </div>
      )}
      <RadixSwitch.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className={styles.root}
      >
        <RadixSwitch.Thumb className={styles.thumb} />
      </RadixSwitch.Root>
    </div>
  );
}
