import clsx from 'clsx';
import styles from './Donut.module.css';

export interface DonutSlice {
  label: string;
  value: number;
  tone: 'clay' | 'moss' | 'turmeric' | 'tamarind' | 'ink';
}

interface DonutProps {
  slices: DonutSlice[];
  centerLabel?: string;
  centerSub?: string;
  className?: string;
}

export function Donut({ slices, centerLabel, centerSub, className }: DonutProps) {
  const total = Math.max(1, slices.reduce((s, item) => s + Math.max(0, item.value), 0));
  const r = 42;
  const circ = 2 * Math.PI * r;

  let cumulative = 0;

  return (
    <div className={clsx(styles.wrap, className)}>
      <div className={styles.ringWrap}>
        <svg viewBox="0 0 112 112" className={styles.svg} aria-hidden="true">
          <circle cx="56" cy="56" r={r} className={styles.track} />
          {slices.map((slice) => {
            const pct = Math.max(0, slice.value) / total;
            const dash = pct * circ;
            const offset = -cumulative * circ;
            cumulative += pct;
            if (dash <= 0.5) return null;
            return (
              <circle
                key={slice.label}
                cx="56"
                cy="56"
                r={r}
                className={clsx(styles.slice, styles[slice.tone])}
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeDashoffset={offset}
              />
            );
          })}
        </svg>
        {(centerLabel || centerSub) && (
          <div className={styles.center}>
            {centerLabel && <span className={styles.centerVal}>{centerLabel}</span>}
            {centerSub && <span className={styles.centerSub}>{centerSub}</span>}
          </div>
        )}
      </div>

      <ul className={styles.legend}>
        {slices.map((s) => (
          <li key={s.label} className={styles.legendItem}>
            <span className={clsx(styles.swatch, styles[s.tone])} aria-hidden="true" />
            <span className={styles.legendLabel}>{s.label}</span>
            <span className={styles.legendPct}>{Math.round((s.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
