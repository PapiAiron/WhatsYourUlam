import clsx from 'clsx';
import styles from './Skeleton.module.css';

interface SkeletonProps {
  variant?: 'line' | 'tile' | 'circle';
  className?: string;
}

export function Skeleton({ variant = 'line', className }: SkeletonProps) {
  return (
    <div
      className={clsx(styles.skeleton, styles[variant], className)}
      aria-hidden="true"
    />
  );
}
