import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Skeleton } from '@/components/ui/Skeleton';
import { AboutPage } from '@/features/about';
import { AuthActionPage } from '@/features/auth/AuthActionPage';
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage';
import {
  RequireAdmin,
  RequireOnboarded,
  RequireVerified,
} from '@/features/auth/Guards';
import { LoginPage } from '@/features/auth/LoginPage';
import { SignupPage } from '@/features/auth/SignupPage';
import { VerifyEmailPage } from '@/features/auth/VerifyEmailPage';
import { LandingPage } from '@/features/landing/LandingPage';
import {
  ContactPage,
  CookiesPage,
  NotFoundPage,
  PrivacyPage,
  TermsPage,
} from '@/features/legal/LegalPages';
import { OnboardingPage } from '@/features/onboarding/OnboardingPage';
import { SharePlanPage } from '@/features/plans/SharePlanPage';
import { AppShell } from './AppShell';

const DashboardPage = lazy(() =>
  import('@/features/planner/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);
const NewPlanWizardPage = lazy(() =>
  import('@/features/planner/NewPlanWizardPage').then((m) => ({
    default: m.NewPlanWizardPage,
  }))
);
const SavedPlansPage = lazy(() =>
  import('@/features/plans/SavedPlansPage').then((m) => ({ default: m.SavedPlansPage }))
);
const PlanOverviewPage = lazy(() =>
  import('@/features/plans/PlanOverviewPage').then((m) => ({
    default: m.PlanOverviewPage,
  }))
);
const PlanDayPage = lazy(() =>
  import('@/features/plans/PlanDayPage').then((m) => ({ default: m.PlanDayPage }))
);
const GroceryListPage = lazy(() =>
  import('@/features/grocery/GroceryListPage').then((m) => ({
    default: m.GroceryListPage,
  }))
);
const BudgetMonitorPage = lazy(() =>
  import('@/features/budget/BudgetMonitorPage').then((m) => ({
    default: m.BudgetMonitorPage,
  }))
);
const RecipesPage = lazy(() =>
  import('@/features/recipes/RecipesPage').then((m) => ({ default: m.RecipesPage }))
);
const MyPricesPage = lazy(() =>
  import('@/features/prices/MyPricesPage').then((m) => ({ default: m.MyPricesPage }))
);
const SettingsPage = lazy(() =>
  import('@/features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);
const AdminPage = lazy(() =>
  import('@/features/admin/AdminPage').then((m) => ({ default: m.AdminPage }))
);

import styles from './Router.module.css';

function RouteFallback() {
  return (
    <div className={styles.fallback}>
      <Skeleton variant="tile" />
    </div>
  );
}

export function AppRouter() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/auth/action" element={<AuthActionPage />} />
          <Route path="/share/:shareId" element={<SharePlanPage />} />

          <Route path="/about" element={<AboutPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/cookies" element={<CookiesPage />} />
          <Route path="/contact" element={<ContactPage />} />

          <Route
            path="/onboarding"
            element={
              <RequireVerified>
                <OnboardingPage />
              </RequireVerified>
            }
          />

          <Route
            path="/app"
            element={
              <RequireOnboarded>
                <AppShell />
              </RequireOnboarded>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="new" element={<NewPlanWizardPage />} />
            <Route path="plans" element={<SavedPlansPage />} />
            <Route path="plans/:planId" element={<PlanOverviewPage />} />
            <Route path="plans/:planId/day/:dayNum" element={<PlanDayPage />} />
            <Route path="plans/:planId/grocery" element={<GroceryListPage />} />
            <Route path="plans/:planId/budget" element={<BudgetMonitorPage />} />
            <Route path="recipes" element={<RecipesPage />} />
            <Route path="prices" element={<MyPricesPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route
              path="admin"
              element={
                <RequireAdmin>
                  <AdminPage />
                </RequireAdmin>
              }
            />
          </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
