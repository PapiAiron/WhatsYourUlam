import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { BRAND } from '@/constants/brand';
import { Logo } from '../Logo';
import styles from './Wordmark.module.css';

interface WordmarkProps {
  to?: string;
  size?: 'sm' | 'md';
  showBadge?: boolean;
  className?: string;
}

export function Wordmark({
  to = '/',
  size = 'md',
  showBadge = false,
  className,
}: WordmarkProps) {
  const inner = (
    <span className={clsx(styles.wrap, styles[size], className)}>
      <Logo size={size === 'sm' ? 'sm' : 'md'} />
      <span className={styles.title}>{BRAND.name}</span>
      {showBadge && <span className={styles.marketTag}>PH</span>}
    </span>
  );

  if (!to) return inner;
  return (
    <Link to={to} className={styles.link}>
      {inner}
    </Link>
  );
}
