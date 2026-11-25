import type { ReactNode } from 'react';
import clsx from 'clsx';
import styles from './Badge.module.css';

interface BadgeProps {
  children: ReactNode;
  tone?: 'neutral' | 'moss' | 'clay' | 'turmeric' | 'tamarind';
  className?: string;
}

export function Badge({ children, tone = 'neutral', className }: BadgeProps) {
  return (
    <span className={clsx(styles.badge, styles[tone], className)}>
      {children}
    </span>
  );
}
