import type { ReactNode } from 'react';
import clsx from 'clsx';
import styles from './BentoGrid.module.css';

interface BentoGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4 | 6 | 12;
  className?: string;
}

export function BentoGrid({ children, columns = 12, className }: BentoGridProps) {
  const colClass =
    columns === 2
      ? styles.cols2
      : columns === 3
        ? styles.cols3
        : columns === 4
          ? styles.cols4
          : columns === 6
            ? styles.cols6
            : styles.cols12;

  return <div className={clsx(styles.grid, colClass, className)}>{children}</div>;
}
