import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './shared/contexts/AuthContext.js';
import { useAuth } from './shared/hooks/useAuth.js';
import { DialogProvider } from './shared/contexts/DialogContext.js';
import AppLayout from './shared/components/layout/AppLayout.js';
import Spinner from './shared/components/ui/Spinner.js';
import PageErrorState from './shared/components/ui/PageErrorState.js';
import Login from './features/auth/pages/Login.js';
import Register from './features/auth/pages/Register.js';
import ForgotPassword from './features/auth/pages/ForgotPassword.js';
import ResetPassword from './features/auth/pages/ResetPassword.js';
import Privacy from './features/auth/pages/Privacy.js';
import Terms from './features/auth/pages/Terms.js';
import Profile from './features/auth/pages/Profile.js';
import Dashboard from './features/dashboard/pages/Dashboard.js';
import Transactions from './features/transactions/pages/Transactions.js';
import Accounts from './features/accounts/pages/Accounts.js';
import Categories from './features/categories/pages/Categories.js';
import Reports from './features/reports/pages/Reports.js';
import Balances from './features/reports/pages/Balances.js';
import SpendByCategory from './features/reports/pages/SpendByCategory.js';
import Frequency from './features/reports/pages/Frequency.js';

interface ChildrenProps {
  children: React.ReactNode;
}

function AppInit({ children }: ChildrenProps): React.ReactNode {
  const { loadSession } = useAuth();
  useEffect(() => {
    loadSession();
  }, [loadSession]);
  return children;
}

function PrivateRoute({ children }: ChildrenProps): JSX.Element {
  const { user, loading, authError, loadSession } = useAuth();

  if (loading) return <Spinner className="min-h-screen" />;

  if (authError) {
    return (
      <div className="min-h-screen bg-canvas p-4 md:p-8">
        <div className="mx-auto max-w-xl pt-10">
          <PageErrorState
            title="No pudimos iniciar la aplicación"
            message={authError}
            onAction={loadSession}
          />
        </div>
      </div>
    );
  }

  return user ? <AppLayout>{children}</AppLayout> : <Navigate to="/login" replace />;
}

function GuestRoute({ children }: ChildrenProps): JSX.Element {
  const { user, loading } = useAuth();
  if (loading) return <Spinner className="min-h-screen" />;
  return user ? <Navigate to="/" replace /> : <>{children}</>;
}

function App(): JSX.Element {
  return (
    <DialogProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppInit>
            <Routes>
              <Route
                path="/login"
                element={
                  <GuestRoute>
                    <Login />
                  </GuestRoute>
                }
              />
              <Route
                path="/register"
                element={
                  <GuestRoute>
                    <Register />
                  </GuestRoute>
                }
              />
              <Route
                path="/forgot-password"
                element={
                  <GuestRoute>
                    <ForgotPassword />
                  </GuestRoute>
                }
              />
              <Route
                path="/reset-password"
                element={
                  <GuestRoute>
                    <ResetPassword />
                  </GuestRoute>
                }
              />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route
                path="/"
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/transactions"
                element={
                  <PrivateRoute>
                    <Transactions />
                  </PrivateRoute>
                }
              />
              <Route
                path="/accounts"
                element={
                  <PrivateRoute>
                    <Accounts />
                  </PrivateRoute>
                }
              />
              <Route
                path="/categories"
                element={
                  <PrivateRoute>
                    <Categories />
                  </PrivateRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <PrivateRoute>
                    <Reports />
                  </PrivateRoute>
                }
              />
              <Route
                path="/reports/balances"
                element={
                  <PrivateRoute>
                    <Balances />
                  </PrivateRoute>
                }
              />
              <Route
                path="/reports/spend-by-category"
                element={
                  <PrivateRoute>
                    <SpendByCategory />
                  </PrivateRoute>
                }
              />
              <Route
                path="/reports/frequency"
                element={
                  <PrivateRoute>
                    <Frequency />
                  </PrivateRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <PrivateRoute>
                    <Profile />
                  </PrivateRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppInit>
        </BrowserRouter>
      </AuthProvider>
    </DialogProvider>
  );
}

export default App;
