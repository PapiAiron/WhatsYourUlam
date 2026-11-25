import { X } from '@phosphor-icons/react';
import clsx from 'clsx';
import { useUiStore } from '@/store/ui';
import styles from './Toast.module.css';

export function Toaster() {
  const { toasts, dismissToast } = useUiStore();

  if (toasts.length === 0) return null;

  return (
    <div className={styles.viewport} role="region" aria-label="Notifications" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={clsx(styles.toast, t.tone && styles[t.tone])}>
          <div className={styles.copy}>
            <strong className={styles.title}>{t.title}</strong>
            {t.description && <p className={styles.desc}>{t.description}</p>}
          </div>
          <div className={styles.actions}>
            {t.actionLabel && t.onAction && (
              <button
                type="button"
                className={styles.undoBtn}
                onClick={() => {
                  t.onAction?.();
                  dismissToast(t.id);
                }}
              >
                {t.actionLabel}
              </button>
            )}
            <button
              type="button"
              className={styles.closeBtn}
              onClick={() => dismissToast(t.id)}
              aria-label="Dismiss notification"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
