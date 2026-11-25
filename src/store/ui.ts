import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { getConsentState, setConsentState, type ConsentState } from '@/lib/analytics';

export type ThemeMode = 'light' | 'dark';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  tone?: 'default' | 'moss' | 'clay' | 'tamarind';
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
}

interface UiState {
  theme: ThemeMode;
  toasts: ToastItem[];
  consent: ConsentState;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  pushToast: (toast: Omit<ToastItem, 'id'>) => string;
  dismissToast: (id: string) => void;
  acceptConsent: (state: 'essential' | 'accepted') => void;
}

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = window.localStorage.getItem('smp_theme');
    if (stored === 'dark' || stored === 'light') {
      document.documentElement.setAttribute('data-theme', stored);
      return stored;
    }
  } catch {
    // Ignore storage errors
  }
  const prefersDark =
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme: ThemeMode = prefersDark ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);
  return theme;
}

export const useUiStore = create<UiState>((set, get) => ({
  theme: getInitialTheme(),
  toasts: [],
  consent: getConsentState(),
  setTheme: (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      window.localStorage.setItem('smp_theme', theme);
    } catch {
      // Ignore storage errors
    }
    set({ theme });
  },
  toggleTheme: () => {
    const next: ThemeMode = get().theme === 'light' ? 'dark' : 'light';
    get().setTheme(next);
  },
  pushToast: (toast) => {
    const id = nanoid(8);
    const item: ToastItem = { id, ...toast };
    set((s) => ({ toasts: [...s.toasts.slice(-3), item] }));
    const duration = toast.durationMs ?? (toast.onAction ? 30000 : 4500);
    window.setTimeout(() => {
      get().dismissToast(id);
    }, duration);
    return id;
  },
  dismissToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
  acceptConsent: (state) => {
    setConsentState(state);
    set({ consent: state });
  },
}));
