const CONSENT_KEY = 'smp_cookie_consent';

export type ConsentState = 'unset' | 'essential' | 'accepted';

export function getConsentState(): ConsentState {
  if (typeof window === 'undefined') return 'unset';
  try {
    const v = window.localStorage.getItem(CONSENT_KEY);
    if (v === 'essential' || v === 'accepted') return v;
  } catch {
    return 'unset';
  }
  return 'unset';
}

export function setConsentState(state: 'essential' | 'accepted'): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CONSENT_KEY, state);
  } catch {
    // Ignore storage restriction errors in sandboxed iframes
  }
}

export function trackEvent(name: string, props?: Record<string, string | number | boolean>): void {
  if (getConsentState() !== 'accepted') return;
  if (import.meta.env.DEV) {
    console.debug('[analytics]', name, props ?? {});
  }
}
