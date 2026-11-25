import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth';
import { COUNTRIES, type CountryCode } from '@shared/index';
import { BentoGrid } from '@/components/bento/BentoGrid';
import { BentoTile } from '@/components/bento/BentoTile';
import { Seo } from '@/components/seo/Seo';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Field, fieldStyles } from '@/components/ui/Field';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useAuth } from '@/features/auth/AuthProvider';
import { mapFirebaseAuthError } from '@/features/auth/firebaseErrors';
import {
  deleteAllUserData,
  exportUserDataJson,
  updateUserProfile,
} from '@/lib/firestoreRepo';
import { useUiStore } from '@/store/ui';
import styles from './SettingsPage.module.css';

export function SettingsPage() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const { theme, setTheme, pushToast } = useUiStore();
  const { i18n } = useTranslation();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [region, setRegion] = useState(profile?.region || 'NCR');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName((prev) => prev || profile.displayName || '');
      setRegion(profile.region || 'NCR');
    }
  }, [profile]);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [changingPw, setChangingPw] = useState(false);

  const [exporting, setExporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const hasPasswordProvider = Boolean(
    user?.providerData.some((p) => p.providerId === 'password')
  );

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    try {
      await updateUserProfile(user.uid, {
        displayName: displayName.trim() || 'Home Cook',
        region,
        country: (profile?.country || 'PH') as CountryCode,
      });
      await refreshProfile();
      pushToast({ title: 'Profile updated', tone: 'moss' });
    } catch (err) {
      pushToast({
        title: 'Could not update profile',
        description: err instanceof Error ? err.message : 'Please try again.',
        tone: 'tamarind',
      });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !user.email) return;
    if (newPw.length < 10) {
      pushToast({ title: 'Use at least 10 characters', tone: 'tamarind' });
      return;
    }
    setChangingPw(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, currentPw);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPw);
      setCurrentPw('');
      setNewPw('');
      pushToast({ title: 'Password updated', tone: 'moss' });
    } catch (err) {
      pushToast({
        title: 'Password update failed',
        description: mapFirebaseAuthError(err),
        tone: 'tamarind',
      });
    } finally {
      setChangingPw(false);
    }
  }

  async function handleExport() {
    if (!user) return;
    setExporting(true);
    try {
      const data = await exportUserDataJson(user.uid);
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `whats-you-ulam-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      pushToast({ title: 'Data exported as JSON', tone: 'moss' });
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteAccount() {
    if (!user) return;
    setDeleting(true);
    try {
      await deleteAllUserData(user.uid);
      await user.delete();
      await signOut();
      navigate('/');
      pushToast({ title: 'Account deleted', tone: 'default' });
    } catch (err) {
      pushToast({
        title: 'Could not delete account',
        description: mapFirebaseAuthError(err),
        tone: 'tamarind',
      });
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  return (
    <div className={styles.page}>
      <Seo title="Settings" noindex />

      <div className={styles.header}>
        <span className={styles.eyebrow}>Account & Preferences</span>
        <h1 className={styles.title}>Settings</h1>
      </div>

      <BentoGrid columns={12}>
        <BentoTile colSpan={6} tone="card">
          <h2 className={styles.cardTitle}>Household Profile</h2>
          <form onSubmit={handleSaveProfile} className={styles.form}>
            <Field label="Display name" htmlFor="set-name">
              <input
                id="set-name"
                required
                className={fieldStyles.input}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </Field>
            <Field label="Default market region" htmlFor="set-region">
              <select
                id="set-region"
                className={fieldStyles.select}
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              >
                {COUNTRIES.PH.regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </Field>
            <Button type="submit" loading={savingProfile}>
              Save profile
            </Button>
          </form>
        </BentoTile>

        <BentoTile colSpan={6} tone="paper2">
          <h2 className={styles.cardTitle}>Appearance & Language</h2>
          <div className={styles.form}>
            <Field label="Color theme">
              <SegmentedControl
                value={theme}
                onChange={(v) => setTheme(v as 'light' | 'dark')}
                options={[
                  { value: 'light', label: 'Warm Paper' },
                  { value: 'dark', label: 'Evening Kitchen' },
                ]}
              />
            </Field>

            <Field label="Interface language">
              <SegmentedControl
                value={i18n.language === 'fil' ? 'fil' : 'en'}
                onChange={(lng) => {
                  void i18n.changeLanguage(lng);
                  try {
                    window.localStorage.setItem('smp_locale', lng);
                  } catch {
                    // Ignore storage restrictions in embedded iframes
                  }
                  if (user) {
                    void updateUserProfile(user.uid, { locale: lng as 'en' | 'fil' });
                  }
                }}
                options={[
                  { value: 'en', label: 'English' },
                  { value: 'fil', label: 'Filipino (Beta)' },
                ]}
              />
            </Field>
          </div>
        </BentoTile>

        {hasPasswordProvider && (
          <BentoTile colSpan={6} tone="card">
            <h2 className={styles.cardTitle}>Change Password</h2>
            <form onSubmit={handlePasswordChange} className={styles.form}>
              <Field label="Current password" htmlFor="pw-curr">
                <input
                  id="pw-curr"
                  type="password"
                  required
                  className={fieldStyles.input}
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                />
              </Field>
              <Field label="New passphrase (10+ characters)" htmlFor="pw-new">
                <input
                  id="pw-new"
                  type="password"
                  required
                  minLength={10}
                  className={fieldStyles.input}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                />
              </Field>
              <Button type="submit" variant="outline" loading={changingPw}>
                Update password
              </Button>
            </form>
          </BentoTile>
        )}

        <BentoTile colSpan={6} tone="tamarindWash">
          <h2 className={styles.cardTitle}>Data & Privacy</h2>
          <p className={styles.desc}>
            Download all your saved meal plans and local price overrides in JSON, or permanently delete your account.
          </p>
          <div className={styles.actions}>
            <Button variant="outline" loading={exporting} onClick={() => void handleExport()}>
              Export JSON data
            </Button>
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              Delete account
            </Button>
          </div>
        </BentoTile>
      </BentoGrid>

      <Dialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Permanently delete your account?"
        description="All saved meal plans, grocery lists, and custom prices will be permanently erased."
      >
        <div className={styles.actions}>
          <Button variant="danger" loading={deleting} onClick={() => void handleDeleteAccount()}>
            Yes, delete everything
          </Button>
          <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
            Cancel
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
