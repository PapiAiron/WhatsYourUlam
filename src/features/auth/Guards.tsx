import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from './AuthProvider';
import styles from './AuthPage.module.css';

function LoadingScreen() {
  return (
    <div className={styles.loadingWrap}>
      <div className={styles.loadingCard}>
        <Skeleton variant="line" />
        <Skeleton variant="tile" />
        <Skeleton variant="line" />
      </div>
    </div>
  );
}

export function RequireVerified({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <LoadingScreen />;
  if (status === 'signedOut') {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  if (status === 'unverified') {
    return <Navigate to="/verify-email" replace />;
  }
  return <>{children}</>;
}

export function RequireOnboarded({ children }: { children: ReactNode }) {
  const { status, profile } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <LoadingScreen />;
  if (status === 'signedOut') {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  if (status === 'unverified') {
    return <Navigate to="/verify-email" replace />;
  }
  if (profile && !profile.onboardingComplete) {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { status, isAdmin } = useAuth();
  if (status === 'loading') return <LoadingScreen />;
  if (!isAdmin) return <Navigate to="/app" replace />;
  return <>{children}</>;
}
