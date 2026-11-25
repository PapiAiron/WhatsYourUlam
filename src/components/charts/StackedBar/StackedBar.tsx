import clsx from 'clsx';
import styles from './StackedBar.module.css';

export interface StackedSegment {
  id: string;
  label: string;
  value: number;
  tone: 'clay' | 'moss' | 'turmeric' | 'tamarind' | 'ink';
}

interface StackedBarProps {
  segments: StackedSegment[];
  showLegend?: boolean;
  className?: string;
}

export function StackedBar({ segments, showLegend = true, className }: StackedBarProps) {
  const total = Math.max(1, segments.reduce((s, item) => s + Math.max(0, item.value), 0));

  return (
    <div className={clsx(styles.wrap, className)}>
      <div className={styles.bar} role="img" aria-label="Cost proportion bar">
        {segments.map((seg) => {
          const pct = Math.max(0, (seg.value / total) * 100);
          if (pct <= 0.4) return null;
          return (
            <div
              key={seg.id}
              className={clsx(styles.seg, styles[seg.tone])}
              style={{ '--seg-w': `${pct.toFixed(2)}%` } as React.CSSProperties}
              title={`${seg.label}: ${Math.round(pct)}%`}
            />
          );
        })}
      </div>
      {showLegend && (
        <div className={styles.legend}>
          {segments.slice(0, 6).map((seg) => (
            <span key={seg.id} className={styles.legendItem}>
              <span className={clsx(styles.dot, styles[seg.tone])} aria-hidden="true" />
              <span>{seg.label}</span>
              <span className={styles.pct}>{Math.round((seg.value / total) * 100)}%</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
