import clsx from 'clsx';
import styles from './DishPlaceholder.module.css';

interface DishPlaceholderProps {
  title: string;
  tone?: 'clay' | 'moss' | 'turmeric' | 'tamarind';
  shimmer?: boolean;
  className?: string;
}

export function DishPlaceholder({
  title,
  tone = 'clay',
  shimmer = false,
  className,
}: DishPlaceholderProps) {
  return (
    <div
      className={clsx(
        styles.placeholder,
        styles[tone],
        shimmer && styles.shimmer,
        className
      )}
      role="img"
      aria-label={title}
    >
      <svg viewBox="0 0 120 90" fill="none" className={styles.svg} aria-hidden="true">
        <ellipse cx="60" cy="68" rx="34" ry="8" className={styles.shadow} />
        <path
          d="M24 44C24 42.3431 25.3431 41 27 41H93C94.6569 41 96 42.3431 96 44C96 58.3594 79.8823 70 60 70C40.1177 70 24 58.3594 24 44Z"
          className={styles.bowl}
        />
        <ellipse cx="60" cy="41" rx="33" ry="8" className={styles.rim} />
        <circle cx="48" cy="39" r="7" className={styles.garnishA} />
        <circle cx="64" cy="37" r="9" className={styles.garnishB} />
        <path
          d="M52 24C50 20 53 16 51 12"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          opacity="0.45"
        />
        <path
          d="M66 22C64 18 67 14 65 10"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          opacity="0.35"
        />
      </svg>
    </div>
  );
}
