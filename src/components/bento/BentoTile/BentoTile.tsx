import type { ReactNode } from 'react';
import clsx from 'clsx';
import styles from './BentoTile.module.css';

export type BentoTone =
  | 'card'
  | 'paper2'
  | 'clay'
  | 'clayWash'
  | 'moss'
  | 'mossWash'
  | 'turmericWash'
  | 'tamarindWash'
  | 'ink';

interface BentoTileProps {
  children: ReactNode;
  colSpan?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 12;
  rowSpan?: 1 | 2 | 3;
  tone?: BentoTone;
  leaf?: boolean;
  interactive?: boolean;
  compact?: boolean;
  className?: string;
}

const COL_CLASS_MAP: Record<number, string> = {
  1: styles.span1,
  2: styles.span2,
  3: styles.span3,
  4: styles.span4,
  5: styles.span5,
  6: styles.span6,
  7: styles.span7,
  8: styles.span8,
  9: styles.span9,
  10: styles.span10,
  12: styles.span12,
};

export function BentoTile({
  children,
  colSpan = 4,
  rowSpan = 1,
  tone = 'card',
  leaf = false,
  interactive = false,
  compact = false,
  className,
}: BentoTileProps) {
  return (
    <div
      className={clsx(
        styles.tile,
        COL_CLASS_MAP[colSpan],
        rowSpan === 2 && styles.row2,
        rowSpan === 3 && styles.row3,
        styles[tone],
        leaf && styles.leaf,
        interactive && styles.interactive,
        compact && styles.compact,
        className
      )}
    >
      {children}
    </div>
  );
}
