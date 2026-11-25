import type { FirebaseError } from 'firebase/app';

export function mapFirebaseAuthError(error: unknown): string {
  const code = (error as FirebaseError)?.code ?? '';
  switch (code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Contact support for help.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password. Double-check and try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try logging in instead.';
    case 'auth/weak-password':
      return 'Use a longer passphrase of at least 10 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts right now. Wait a moment before trying again.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in window closed before finishing.';
    case 'auth/account-exists-with-different-credential':
      return 'This email already uses email & password sign-in. Log in with your password first.';
    case 'auth/requires-recent-login':
      return 'For your safety, please confirm your current password to continue.';
    case 'auth/expired-action-code':
    case 'auth/invalid-action-code':
      return 'This verification or reset link has expired. Request a fresh one.';
    default:
      return error instanceof Error
        ? error.message
        : 'Sign-in could not be completed. Please try again.';
  }
}
