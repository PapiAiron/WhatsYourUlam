import clsx from 'clsx';
import styles from './RingProgress.module.css';

interface RingProgressProps {
  value: number; // 0 to 100
  label?: string;
  sublabel?: string;
  tone?: 'clay' | 'moss' | 'turmeric' | 'tamarind';
  size?: number;
  className?: string;
}

export function RingProgress({
  value,
  label,
  sublabel,
  tone = 'moss',
  size = 128,
  className,
}: RingProgressProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const r = 46;
  const circ = 2 * Math.PI * r;
  const offset = circ - (clamped / 100) * circ;

  return (
    <div
      className={clsx(styles.wrap, styles[tone], className)}
      style={{ '--ring-size': `${size}px` } as React.CSSProperties}
    >
      <svg viewBox="0 0 112 112" className={styles.svg} aria-hidden="true">
        <circle cx="56" cy="56" r={r} className={styles.track} />
        <circle
          cx="56"
          cy="56"
          r={r}
          className={styles.fill}
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <div className={styles.center}>
        <span className={styles.value}>{label ?? `${clamped}%`}</span>
        {sublabel && <span className={styles.sub}>{sublabel}</span>}
      </div>
    </div>
  );
}
