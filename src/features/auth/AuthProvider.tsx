import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import type { UserProfile } from '@shared/index';
import { BRAND } from '@/constants/brand';
import { auth, googleProvider, testFirestoreConnection } from '@/lib/firebase';
import { ensureUserProfile, getUserProfile } from '@/lib/firestoreRepo';

export type AuthStatus = 'loading' | 'signedOut' | 'unverified' | 'ready';

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
  refreshVerification: () => Promise<boolean>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  const syncUserState = useCallback(async (fbUser: User | null) => {
    if (!fbUser) {
      setUser(null);
      setProfile(null);
      setStatus('signedOut');
      return;
    }

    setUser(fbUser);
    const isGoogle = fbUser.providerData.some((p) => p.providerId === 'google.com');
    const verified = fbUser.emailVerified || isGoogle;

    if (!verified) {
      setProfile(null);
      setStatus('unverified');
      return;
    }

    try {
      const existing = await getUserProfile(fbUser.uid);
      if (existing) {
        setProfile(existing);
      } else {
        const created = await ensureUserProfile({
          uid: fbUser.uid,
          displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Home Cook',
          email: fbUser.email || '',
          photoURL: fbUser.photoURL,
        });
        setProfile(created);
      }
      setStatus('ready');
    } catch {
      setStatus('ready');
    }
  }, []);

  useEffect(() => {
    void testFirestoreConnection();
    void getRedirectResult(auth).catch(() => {});

    const unsub = onAuthStateChanged(auth, (fbUser) => {
      void syncUserState(fbUser);
    });
    return () => unsub();
  }, [syncUserState]);

  const refreshProfile = useCallback(async () => {
    const current = auth.currentUser;
    if (!current) return;
    const p = await getUserProfile(current.uid);
    if (p) setProfile(p);
  }, []);

  const refreshVerification = useCallback(async (): Promise<boolean> => {
    const current = auth.currentUser;
    if (!current) return false;
    await current.reload();
    await current.getIdToken(true);
    await syncUserState(auth.currentUser);
    return Boolean(auth.currentUser?.emailVerified);
  }, [syncUserState]);

  const signInWithGoogle = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setProfile(null);
    setStatus('signedOut');
  }, []);

  const isAdmin = Boolean(
    user?.emailVerified &&
      user.email &&
      (BRAND.adminEmails as readonly string[]).includes(user.email.toLowerCase())
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      profile,
      isAdmin,
      refreshProfile,
      refreshVerification,
      signInWithGoogle,
      signOut,
    }),
    [
      status,
      user,
      profile,
      isAdmin,
      refreshProfile,
      refreshVerification,
      signInWithGoogle,
      signOut,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
