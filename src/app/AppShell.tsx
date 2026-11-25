import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  CurrencyCircleDollar,
  FolderSimple,
  GearSix,
  House,
  Moon,
  PlusCircle,
  ShieldCheck,
  Sun,
} from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { Wordmark } from '@/components/brand/Wordmark';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Menu } from '@/components/ui/Menu';
import { useAuth } from '@/features/auth/AuthProvider';
import { listUserPlans } from '@/lib/firestoreRepo';
import { useUiStore } from '@/store/ui';
import styles from './AppShell.module.css';

export function AppShell() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const { theme, toggleTheme } = useUiStore();
  const navigate = useNavigate();

  const { data: plans = [] } = useQuery({
    queryKey: ['plans', user?.uid],
    queryFn: () => (user ? listUserPlans(user.uid) : Promise.resolve([])),
    enabled: Boolean(user),
  });

  const latestPlan = plans[0];

  const navItems = [
    { to: '/app', label: 'Overview', icon: House, end: true },
    { to: '/app/new', label: 'New plan', icon: PlusCircle },
    { to: '/app/plans', label: 'Saved plans', icon: FolderSimple },
    { to: '/app/recipes', label: 'Recipes', icon: BookOpen },
    { to: '/app/prices', label: 'My prices', icon: CurrencyCircleDollar },
    { to: '/app/settings', label: 'Settings', icon: GearSix },
    ...(isAdmin ? [{ to: '/app/admin', label: 'Admin', icon: ShieldCheck }] : []),
  ];

  return (
    <div className={styles.shell}>
      <aside className={styles.rail} aria-label="Workspace navigation">
        <div className={styles.railTop}>
          <Wordmark to="/app" size="sm" />
        </div>

        <nav className={styles.railNav}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  clsx(styles.railLink, isActive && styles.railLinkActive)
                }
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {latestPlan && (
          <div className={styles.railPlanBox}>
            <span className={styles.railLabel}>Active plan</span>
            <Link to={`/app/plans/${latestPlan.id}`} className={styles.railPlanLink}>
              <strong>{latestPlan.name}</strong>
              <span>
                {latestPlan.input.days}d · {latestPlan.input.people}p
              </span>
            </Link>
          </div>
        )}
      </aside>

      <div className={styles.contentCol}>
        <header className={styles.topBar}>
          <div className={styles.mobileBrand}>
            <Wordmark to="/app" size="sm" />
          </div>

          <div className={styles.topCenter}>
            {latestPlan ? (
              <Link to={`/app/plans/${latestPlan.id}`} className={styles.activeChip}>
                Latest: <strong>{latestPlan.name}</strong>
              </Link>
            ) : (
              <span className={styles.topHint}>Ready to plan around your budget</span>
            )}
          </div>

          <div className={styles.topRight}>
            <Link to="/app/new" className={styles.newBtnDesktop}>
              <Button size="sm">New plan</Button>
            </Link>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <Menu
              trigger={
                <button
                  type="button"
                  className={styles.avatarBtn}
                  aria-label="Account menu"
                >
                  <Avatar
                    name={profile?.displayName || user?.displayName || user?.email || 'Cook'}
                    src={user?.photoURL}
                    size="sm"
                  />
                </button>
              }
              items={[
                {
                  id: 'settings',
                  label: 'Profile & Settings',
                  onSelect: () => navigate('/app/settings'),
                },
                {
                  id: 'prices',
                  label: 'My local prices',
                  onSelect: () => navigate('/app/prices'),
                },
                ...(isAdmin
                  ? [
                      {
                        id: 'admin',
                        label: 'Admin console',
                        onSelect: () => navigate('/app/admin'),
                      },
                    ]
                  : []),
                {
                  id: 'signout',
                  label: 'Log out',
                  danger: true,
                  onSelect: () => {
                    void signOut().then(() => navigate('/'));
                  },
                },
              ]}
            />
          </div>
        </header>

        <main className={styles.main}>
          <Outlet />
        </main>
      </div>

      <nav className={styles.mobileNav} aria-label="Mobile navigation">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                clsx(styles.mobileLink, isActive && styles.mobileLinkActive)
              }
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
