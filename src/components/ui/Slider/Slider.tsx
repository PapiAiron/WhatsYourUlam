import * as RadixSlider from '@radix-ui/react-slider';
import clsx from 'clsx';
import styles from './Slider.module.css';

interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  ariaLabel?: string;
  className?: string;
}

export function Slider({
  value,
  onChange,
  min,
  max,
  step = 100,
  ariaLabel = 'Slider',
  className,
}: SliderProps) {
  return (
    <RadixSlider.Root
      className={clsx(styles.root, className)}
      value={[value]}
      onValueChange={([v]) => onChange(v)}
      min={min}
      max={max}
      step={step}
      aria-label={ariaLabel}
    >
      <RadixSlider.Track className={styles.track}>
        <RadixSlider.Range className={styles.range} />
      </RadixSlider.Track>
      <RadixSlider.Thumb className={styles.thumb} />
    </RadixSlider.Root>
  );
}
