import clsx from 'clsx';
import styles from './Logo.module.css';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Logo({ size = 'md', className }: LogoProps) {
  return (
    <span className={clsx(styles.logo, styles[size], className)} aria-hidden="true">
      <svg viewBox="0 0 36 36" fill="none" className={styles.svg}>
        <path
          d="M17.5 4C15.5 7.2 15.8 9.8 18 11.8C20.2 9.5 20.5 6.8 17.5 4Z"
          fill="var(--moss)"
        />
        <path
          d="M23.5 6.5C21.8 8.4 21.8 10.6 23.4 12.2C25.3 10.8 25.4 8.2 23.5 6.5Z"
          fill="var(--turmeric-fill)"
        />
        <path
          d="M5 17C5 15.8954 5.89543 15 7 15H29C30.1046 15 31 15.8954 31 17C31 24.1797 25.1797 30 18 30C10.8203 30 5 24.1797 5 17Z"
          fill="var(--clay)"
        />
        <path
          d="M11 31.5H25"
          stroke="var(--ink)"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
