import clsx from 'clsx';
import styles from './Sparkline.module.css';

interface SparklineProps {
  values: number[];
  capLineValue?: number;
  height?: number;
  label?: string;
  className?: string;
}

export function Sparkline({
  values,
  capLineValue,
  height = 84,
  label = 'Spending trend',
  className,
}: SparklineProps) {
  const safeValues = values.length > 0 ? values : [0];
  const width = 320;
  const padY = 10;
  const maxVal = Math.max(
    1,
    capLineValue ?? 0,
    ...safeValues
  );

  const pts = safeValues.map((v, i) => {
    const x =
      safeValues.length === 1
        ? width / 2
        : (i / (safeValues.length - 1)) * (width - 16) + 8;
    const y = height - padY - (v / maxVal) * (height - padY * 2);
    return { x, y };
  });

  const linePath = pts
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  const areaPath = `${linePath} L ${pts[pts.length - 1].x.toFixed(1)} ${height - padY} L ${pts[0].x.toFixed(1)} ${height - padY} Z`;

  const capY =
    capLineValue !== undefined
      ? height - padY - (capLineValue / maxVal) * (height - padY * 2)
      : null;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={clsx(styles.svg, className)}
      role="img"
      aria-label={label}
    >
      <path d={areaPath} className={styles.area} />
      {capY !== null && (
        <line
          x1="8"
          x2={width - 8}
          y1={capY}
          y2={capY}
          className={styles.capLine}
        />
      )}
      <path d={linePath} className={styles.line} />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" className={styles.dot} />
      ))}
    </svg>
  );
}
