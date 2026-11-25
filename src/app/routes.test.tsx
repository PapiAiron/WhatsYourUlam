import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { CookieBanner } from '@/components/ui/CookieBanner';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Toaster } from '@/components/ui/Toast';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { AdminPage } from '@/features/admin/AdminPage';
import { BudgetMonitorPage } from '@/features/budget/BudgetMonitorPage';
import { GroceryListPage } from '@/features/grocery/GroceryListPage';
import { OnboardingPage } from '@/features/onboarding/OnboardingPage';
import { DashboardPage } from '@/features/planner/DashboardPage';
import { NewPlanWizardPage } from '@/features/planner/NewPlanWizardPage';
import { PlanDayPage } from '@/features/plans/PlanDayPage';
import { PlanOverviewPage } from '@/features/plans/PlanOverviewPage';
import { SavedPlansPage } from '@/features/plans/SavedPlansPage';
import { MyPricesPage } from '@/features/prices/MyPricesPage';
import { RecipesPage } from '@/features/recipes/RecipesPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { queryClient } from '@/lib/queryClient';
import '@/lib/i18n';
import { AppRouter } from './Router';

const PUBLIC_ROUTES = [
  '/',
  '/about',
  '/login',
  '/signup',
  '/forgot-password',
  '/verify-email',
  '/auth/action',
  '/share/demo-share-id',
  '/privacy',
  '/terms',
  '/cookies',
  '/contact',
  '/not-a-real-route',
];

describe('App public routes render without crashing', () => {
  for (const route of PUBLIC_ROUTES) {
    it(`renders ${route} cleanly inside router context`, () => {
      const html = renderToString(
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <MemoryRouter initialEntries={[route]}>
                <AppRouter />
                <Toaster />
                <CookieBanner />
              </MemoryRouter>
            </AuthProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      );

      expect(html).not.toContain('We hit an unexpected pause');
      expect(html.length).toBeGreaterThan(200);
      if (route === '/') {
        expect(html).toContain('What&#x27;s you ulam');
        expect(html).toContain('Essential storage');
      }
      if (route === '/about') {
        expect(html).toContain('Mark Airon Cantal');
        expect(html).toContain('cantal2227@gmail.com');
        expect(html).toContain('09761386092');
        expect(html).toContain('https://markaironcantal.site/');
        expect(html).toContain('coming soon');
      }
    });
  }
});

describe('App workspace pages render cleanly inside providers', () => {
  const pages = [
    { path: '/onboarding', element: <OnboardingPage /> },
    { path: '/app', element: <DashboardPage /> },
    { path: '/app/new', element: <NewPlanWizardPage /> },
    { path: '/app/plans', element: <SavedPlansPage /> },
    { path: '/app/plans/:planId', url: '/app/plans/plan-1', element: <PlanOverviewPage /> },
    { path: '/app/plans/:planId/day/:dayNum', url: '/app/plans/plan-1/day/1', element: <PlanDayPage /> },
    { path: '/app/plans/:planId/grocery', url: '/app/plans/plan-1/grocery', element: <GroceryListPage /> },
    { path: '/app/plans/:planId/budget', url: '/app/plans/plan-1/budget', element: <BudgetMonitorPage /> },
    { path: '/app/recipes', element: <RecipesPage /> },
    { path: '/app/prices', element: <MyPricesPage /> },
    { path: '/app/settings', element: <SettingsPage /> },
    { path: '/app/admin', element: <AdminPage /> },
  ];

  for (const page of pages) {
    it(`renders ${page.path} without throwing`, () => {
      const html = renderToString(
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <MemoryRouter initialEntries={[page.url ?? page.path]}>
                <Routes>
                  <Route path={page.path} element={page.element} />
                </Routes>
              </MemoryRouter>
            </AuthProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      );
      expect(html).not.toContain('We hit an unexpected pause');
    });
  }
});
