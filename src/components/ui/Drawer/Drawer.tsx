import type { ReactNode } from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from '@phosphor-icons/react';
import styles from './Drawer.module.css';

interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function Drawer({
  open,
  onOpenChange,
  title,
  subtitle,
  children,
}: DrawerProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={styles.overlay} />
        <RadixDialog.Content className={styles.sheet}>
          <div className={styles.header}>
            <div>
              <RadixDialog.Title className={styles.title}>{title}</RadixDialog.Title>
              {subtitle && (
                <RadixDialog.Description className={styles.subtitle}>
                  {subtitle}
                </RadixDialog.Description>
              )}
            </div>
            <RadixDialog.Close className={styles.closeBtn} aria-label="Close panel">
              <X size={20} />
            </RadixDialog.Close>
          </div>
          <div className={styles.scroll}>{children}</div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
